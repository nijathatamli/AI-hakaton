//! One playtest. Capture runs on this thread, the player and the director each get their own,
//! so a slow model never stops the recording.

use crate::agent::{self, Player, Verdict};
use crate::capture;
use crate::input::{Input, DEFAULT_KEYS};
use crate::probes::{self, Engine, LogLine};
use crate::providers::{screenshot_tokens, Provider, Usage};
use crate::recorder::{self, Frame, Ring};
use anyhow::{anyhow, Result};
use serde::Serialize;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub struct SessionConfig {
    pub window: Option<String>,
    pub launch: Option<String>,
    pub engine: Engine,
    pub logs: Vec<PathBuf>,
    pub minutes: f32,
    pub goal: String,
    pub player: String,
    /// none = standalone mode, or an mcp client is directing from outside
    pub director: Option<String>,
    pub out_dir: PathBuf,
    pub keys: Vec<String>,
    /// approved controls. when set they replace `keys`
    pub controls: Option<crate::controls::Controls>,
    pub quiet: bool,
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            window: None,
            launch: None,
            engine: Engine::Generic,
            logs: vec![],
            minutes: 3.0,
            goal: "explore the level and try to break things".into(),
            player: "explore".into(),
            director: None,
            out_dir: PathBuf::from("runs"),
            keys: DEFAULT_KEYS.iter().map(|s| s.to_string()).collect(),
            controls: None,
            quiet: false,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Event {
    pub t_ms: u64,
    pub kind: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct Incident {
    pub id: u32,
    pub t_ms: u64,
    pub kind: String,
    pub detail: String,
    pub console: Vec<String>,
    pub sheet: Option<PathBuf>,
    pub clip: Option<PathBuf>,
    pub reviewed: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct Report {
    pub id: u32,
    pub incident: Option<u32>,
    pub title: String,
    pub severity: String,
    pub steps: Vec<String>,
    pub expected: String,
    pub actual: String,
    pub console: Vec<String>,
    pub sheet: Option<PathBuf>,
    pub clip: Option<PathBuf>,
    pub filed_by: String,
}

#[derive(Debug, Default, Clone, Serialize)]
pub struct Meter {
    pub frames_captured: u64,
    pub player_steps: u64,
    pub player_tokens: Usage,
    pub director_calls: u64,
    pub director_tokens: Usage,
    pub director_bytes_sent: u64,
    /// what a big model would have spent doing computer use itself: one full-size screenshot per player step
    pub naive_director_tokens: u64,
    pub window_size: (u32, u32),
}

#[derive(Serialize)]
pub struct State {
    pub started: bool,
    pub running: bool,
    pub window: String,
    pub goal: String,
    pub player: String,
    pub director: String,
    pub events: Vec<Event>,
    pub incidents: Vec<Incident>,
    pub reports: Vec<Report>,
    pub meter: Meter,
    pub out_dir: PathBuf,
    pub error: Option<String>,
    #[serde(skip)]
    pub latest: Option<Vec<u8>>,
}

pub struct Session {
    pub state: Mutex<State>,
    pub stop: AtomicBool,
    /// true while the user has PlayerOne in front: no input goes to the game, so the Stop button is reachable
    pub paused: AtomicBool,
    start: Instant,
    last_input_ms: AtomicU64,
    /// when the screen last changed. the player uses it to notice its own moves did nothing
    last_change_ms: AtomicU64,
    /// capture loop asks the player to try every key once, to tell a dead end from a soft-lock
    probe_req: AtomicBool,
    probe_done: AtomicBool,
    /// window position, kept fresh by the capture worker so the player never has to touch the window itself
    rect: Mutex<(i32, i32, u32, u32)>,
}

impl Session {
    pub fn t(&self) -> u64 {
        crate::now_ms(self.start)
    }
    pub fn log(&self, kind: &str, text: impl Into<String>) {
        let text = text.into();
        let mut st = self.state.lock().unwrap();
        if !st.started || kind != "action" {
            // actions are noisy, only echo the rest
        }
        st.events.push(Event { t_ms: self.t(), kind: kind.into(), text });
        if st.events.len() > 4000 {
            st.events.drain(..1000);
        }
    }
    pub fn set_goal(&self, goal: &str) {
        self.state.lock().unwrap().goal = goal.to_string();
        self.log("goal", goal);
    }

    /// file a report from outside, for example an mcp client acting as director
    pub fn file_report(&self, v: Verdict, filed_by: &str) -> Result<Report> {
        let mut st = self.state.lock().unwrap();
        let inc = v.incident.and_then(|id| st.incidents.iter().find(|i| i.id == id).cloned());
        let r = Report {
            id: st.reports.len() as u32 + 1,
            incident: v.incident,
            title: if v.title.is_empty() { inc.as_ref().map(|i| i.detail.clone()).unwrap_or_default() } else { v.title },
            severity: if v.severity.is_empty() { "major".into() } else { v.severity },
            // a weak director writes "press a key". the recorded inputs are better than that
            steps: if v.steps.len() >= 2 { v.steps } else { repro_steps_locked(&st, inc.as_ref().map(|i| i.t_ms).unwrap_or(u64::MAX)) },
            expected: v.expected,
            actual: v.actual,
            console: inc.as_ref().map(|i| i.console.clone()).unwrap_or_default(),
            sheet: inc.as_ref().and_then(|i| i.sheet.clone()),
            clip: inc.as_ref().and_then(|i| i.clip.clone()),
            filed_by: filed_by.into(),
        };
        if let Some(id) = r.incident {
            if let Some(i) = st.incidents.iter_mut().find(|i| i.id == id) {
                i.reviewed = true;
            }
        }
        write_report(&st.out_dir, &r)?;
        st.reports.push(r.clone());
        Ok(r)
    }

    /// text digest for a director: what happened since `since_ms`
    pub fn digest(&self, since_ms: u64) -> String {
        let st = self.state.lock().unwrap();
        let mut s = format!(
            "Playtest of window \"{}\". Goal: {}. Time: {:.0}s. Player: {}.\n",
            st.window,
            st.goal,
            self.t() as f32 / 1000.0,
            st.player
        );
        s.push_str("\nRecent events:\n");
        let evs: Vec<&Event> = st.events.iter().filter(|e| e.t_ms >= since_ms && e.kind != "action").collect();
        for e in evs.iter().rev().take(40).rev() {
            s.push_str(&format!("  [{:>6.1}s] {}: {}\n", e.t_ms as f32 / 1000.0, e.kind, e.text));
        }
        let acts = st.events.iter().filter(|e| e.t_ms >= since_ms && e.kind == "action").count();
        s.push_str(&format!("  ({acts} player actions in this window, not listed)\n"));
        let open: Vec<&Incident> = st.incidents.iter().filter(|i| !i.reviewed).collect();
        if open.is_empty() {
            s.push_str("\nNo open incidents.\n");
        } else {
            s.push_str("\nOpen incidents:\n");
            for i in open {
                s.push_str(&format!("  #{} at {:.1}s, {}: {}\n", i.id, i.t_ms as f32 / 1000.0, i.kind, i.detail));
                for c in i.console.iter().take(8) {
                    s.push_str(&format!("      console> {c}\n"));
                }
            }
        }
        s
    }
}

fn write_report(dir: &PathBuf, r: &Report) -> Result<()> {
    let rdir = dir.join("reports");
    std::fs::create_dir_all(&rdir)?;
    let mut md = format!("# {}\n\nSeverity: {}\nFiled by: {}\n", r.title, r.severity, r.filed_by);
    if let Some(i) = r.incident {
        md.push_str(&format!("Incident: #{i}\n"));
    }
    if !r.steps.is_empty() {
        md.push_str("\n## Steps to reproduce\n\n");
        for (n, s) in r.steps.iter().enumerate() {
            md.push_str(&format!("{}. {s}\n", n + 1));
        }
    }
    if !r.expected.is_empty() {
        md.push_str(&format!("\n## Expected\n\n{}\n", r.expected));
    }
    if !r.actual.is_empty() {
        md.push_str(&format!("\n## Actual\n\n{}\n", r.actual));
    }
    if !r.console.is_empty() {
        md.push_str("\n## Engine console\n\n```\n");
        for c in &r.console {
            md.push_str(c);
            md.push('\n');
        }
        md.push_str("```\n");
    }
    if let Some(p) = &r.sheet {
        md.push_str(&format!("\n![frames before the bug](../{})\n", p.file_name().unwrap().to_string_lossy()));
    }
    if let Some(p) = &r.clip {
        md.push_str(&format!("\nClip: ../{}\n", p.file_name().unwrap().to_string_lossy()));
    }
    std::fs::write(rdir.join(format!("{:03}.md", r.id)), md)?;
    Ok(())
}

pub fn new_session(cfg: &SessionConfig) -> Arc<Session> {
    Arc::new(Session {
        state: Mutex::new(State {
            started: false,
            running: true,
            window: cfg.window.clone().unwrap_or_default(),
            goal: cfg.goal.clone(),
            player: cfg.player.clone(),
            director: cfg.director.clone().unwrap_or_else(|| "none".into()),
            events: vec![],
            incidents: vec![],
            reports: vec![],
            meter: Meter::default(),
            out_dir: cfg.out_dir.clone(),
            error: None,
            latest: None,
        }),
        stop: AtomicBool::new(false),
        paused: AtomicBool::new(false),
        start: Instant::now(),
        last_input_ms: AtomicU64::new(0),
        last_change_ms: AtomicU64::new(0),
        probe_req: AtomicBool::new(false),
        probe_done: AtomicBool::new(false),
        rect: Mutex::new((0, 0, 1, 1)),
    })
}

/// runs to completion on the calling thread
pub fn run(sess: Arc<Session>, cfg: SessionConfig) -> Result<()> {
    let res = run_inner(&sess, cfg);
    let mut st = sess.state.lock().unwrap();
    st.running = false;
    if let Err(e) = &res {
        st.error = Some(e.to_string());
    }
    let summary = serde_json::to_string_pretty(&*st).unwrap_or_default();
    let _ = std::fs::write(st.out_dir.join("session.json"), summary);
    res
}

fn say(cfg_quiet: bool, msg: &str) {
    if !cfg_quiet {
        eprintln!("{msg}");
    }
}

fn run_inner(sess: &Arc<Session>, cfg: SessionConfig) -> Result<()> {
    std::fs::create_dir_all(&cfg.out_dir)?;
    let q = cfg.quiet;
    let (tx, rx) = mpsc::channel::<LogLine>();
    let stop_tail = Arc::new(AtomicBool::new(false));

    // 1. launch or attach
    let mut child: Option<Child> = None;
    if let Some(cmdline) = &cfg.launch {
        let parts = split_cmd(cmdline);
        let (prog, args) = parts.split_first().ok_or_else(|| anyhow!("empty launch command"))?;
        let mut c = Command::new(prog)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| anyhow!("could not launch {prog}: {e}"))?;
        probes::spawn_reader(c.stdout.take().unwrap(), "stdout", cfg.engine, tx.clone(), sess.start);
        probes::spawn_reader(c.stderr.take().unwrap(), "stderr", cfg.engine, tx.clone(), sess.start);
        sess.log("launch", cmdline.clone());
        child = Some(c);
    }
    for p in &cfg.logs {
        probes::spawn_tail(p.clone(), cfg.engine, tx.clone(), sess.start, stop_tail.clone());
        sess.log("probe", format!("following {}", p.display()));
    }

    let pid = child.as_ref().map(|c| c.id());
    let query = cfg.window.clone().unwrap_or_default();
    let mut win = None;
    for _ in 0..60 {
        if let Some(w) = capture::find_window(&query, pid)? {
            win = Some(w);
            break;
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    let win = win.ok_or_else(|| anyhow!("no window matching \"{query}\" showed up"))?;
    let win_id = win.id()?;
    let title = win.title().unwrap_or_default();
    let full = (win.width().unwrap_or(1280), win.height().unwrap_or(720));
    {
        let mut st = sess.state.lock().unwrap();
        st.window = title.clone();
        st.started = true;
        st.meter.window_size = full;
    }
    say(q, &format!("playerone: attached to \"{title}\" ({}x{})", full.0, full.1));
    capture::focus(&win);
    std::thread::sleep(Duration::from_millis(400));

    let ring = Arc::new(Mutex::new(Ring::new(12_000)));
    let deadline = Duration::from_secs_f32(cfg.minutes * 60.0);
    let has_ffmpeg = recorder::ffmpeg_available();

    // 2. player thread
    let player_sess = sess.clone();
    let player_spec = cfg.player.clone();
    let ctrl = cfg.controls.clone().unwrap_or_else(|| crate::controls::Controls::from_keys(&cfg.keys));
    sess.log("controls", format!("{}: {}", ctrl.preset, ctrl.describe()));
    let player_thread = std::thread::spawn(move || -> Result<()> {
        let player = Player::from_spec(&player_spec)?;
        // a cold local model can take a minute to load. pay that once, before the first real move
        if let Player::Model(p) = &player {
            player_sess.log("player", format!("warming up {}", p.label()));
            let _ = p.ask("Reply with {}", "ping", &[], None);
        }
        let mut input = Input::new()?;
        let mut recent: Vec<String> = vec![];
        let probe_keys: Vec<String> = ctrl.movement();
        while !player_sess.stop.load(Ordering::Relaxed) {
            if player_sess.paused.load(Ordering::Relaxed) {
                input.release_all();
                std::thread::sleep(Duration::from_millis(200));
                continue;
            }
            if player_sess.probe_req.swap(false, Ordering::Relaxed) {
                // a human tester would wiggle every control before calling it stuck. so do we
                let rect = *player_sess.rect.lock().unwrap();
                for k in &probe_keys {
                    let a = crate::input::Action::Key { key: k.clone(), ms: 350 };
                    let _ = input.run(&a, rect);
                    player_sess.last_input_ms.store(player_sess.t(), Ordering::Relaxed);
                    std::thread::sleep(Duration::from_millis(150));
                }
                player_sess.probe_done.store(true, Ordering::Relaxed);
                continue;
            }
            let frame = player_sess.state.lock().unwrap().latest.clone();
            let Some(jpeg) = frame else {
                std::thread::sleep(Duration::from_millis(100));
                continue;
            };
            let goal = player_sess.state.lock().unwrap().goal.clone();
            let (mv, usage) = match agent::decide(
                &player,
                &goal,
                &ctrl,
                &jpeg,
                &recent,
                // nothing on screen moved for 1.5s while we were pressing things: we are stuck against something
                player_sess.t().saturating_sub(player_sess.last_change_ms.load(Ordering::Relaxed)) > 1500,
            ) {
                Ok(x) => x,
                Err(e) => {
                    player_sess.log("error", format!("player: {e}"));
                    std::thread::sleep(Duration::from_secs(2));
                    continue;
                }
            };
            {
                let mut st = player_sess.state.lock().unwrap();
                st.meter.player_steps += 1;
                st.meter.player_tokens.input += usage.input;
                st.meter.player_tokens.output += usage.output;
                let (w, h) = st.meter.window_size;
                // a big model playing directly would read one full screenshot plus ~250 tokens of prompt per step, and write ~120
                st.meter.naive_director_tokens += screenshot_tokens(w, h) + 250 + 120;
            }
            if matches!(player, Player::Model(_)) && !mv.note.is_empty() {
                player_sess.log("player", mv.note.clone());
            }
            if let Some(s) = &mv.suspicious {
                if !s.trim().is_empty() && s != "null" {
                    player_sess.log("suspicious", s.clone());
                }
            }
            let rect = *player_sess.rect.lock().unwrap();
            for a in &mv.actions {
                if player_sess.stop.load(Ordering::Relaxed) {
                    break;
                }
                player_sess.last_input_ms.store(player_sess.t(), Ordering::Relaxed);
                if let Err(e) = input.run(a, rect) {
                    player_sess.log("error", format!("input: {e}"));
                }
                player_sess.last_input_ms.store(player_sess.t(), Ordering::Relaxed);
                player_sess.log("action", a.describe());
                recent.push(a.describe());
            }
            if recent.len() > 8 {
                let n = recent.len() - 8;
                recent.drain(..n);
            }
        }
        input.release_all();
        Ok(())
    });

    // 3. director thread, only when we were given one
    let director_thread = cfg.director.clone().map(|spec| {
        let ds = sess.clone();
        std::thread::spawn(move || -> Result<()> {
            let director = Provider::from_spec(&spec)?;
            let mut since = 0u64;
            let mut last_call = Instant::now();
            while !ds.stop.load(Ordering::Relaxed) {
                std::thread::sleep(Duration::from_millis(500));
                let open: Vec<Incident> = ds.state.lock().unwrap().incidents.iter().filter(|i| !i.reviewed).cloned().collect();
                // call when something happened, or every 40s to steer the player
                if open.is_empty() && last_call.elapsed() < Duration::from_secs(40) {
                    continue;
                }
                if !open.is_empty() && last_call.elapsed() < Duration::from_secs(4) {
                    continue;
                }
                direct_once(&ds, &director, &open, since)?;
                since = ds.t();
                last_call = Instant::now();
            }
            // last word on anything still open
            let open: Vec<Incident> = ds.state.lock().unwrap().incidents.iter().filter(|i| !i.reviewed).cloned().collect();
            if !open.is_empty() {
                direct_once(&ds, &director, &open, since)?;
            }
            Ok(())
        })
    });

    // 4. capture loop
    let mut prev: Option<xcap::image::RgbImage> = None;
    let mut last_change = sess.t();
    let mut stall_reported = false;
    let mut console_tail: Vec<String> = vec![];
    let mut seen_errors: Vec<String> = vec![];
    let mut capture_fail = 0;
    let mut no_draw_since: Option<u64> = None;
    let mut hang_reported = false;
    let mut probe_started: Option<u64> = None;
    let mut probe_base: Option<xcap::image::RgbImage> = None;
    let mut probe_moved = false;
    let busy = Arc::new(AtomicBool::new(false));
    type Grab = Option<(xcap::image::RgbImage, (i32, i32, u32, u32))>;
    let (gtx, grx) = mpsc::channel::<Grab>();
    let started = Instant::now();
    let mut next_id = 1u32;

    let mut raise = |sess: &Arc<Session>, kind: &str, detail: String, console: Vec<String>, ring: &Arc<Mutex<Ring>>| {
        let id = next_id;
        next_id += 1;
        let frames = ring.lock().unwrap().snapshot();
        let dir = sess.state.lock().unwrap().out_dir.clone();
        let sheet_path = dir.join(format!("incident-{id:03}.jpg"));
        let sheet = recorder::contact_sheet(&recorder::spread(&frames, 9), 320);
        let sheet = recorder::save_jpeg(&sheet, &sheet_path, 72).ok().map(|_| sheet_path);
        let clip_path = dir.join(format!("incident-{id:03}.mp4"));
        let clip = if has_ffmpeg && recorder::encode_clip(&frames, &clip_path).is_ok() { Some(clip_path) } else { None };
        say(q, &format!("playerone: incident #{id} {kind}: {detail}"));
        sess.log("incident", format!("#{id} {kind}: {detail}"));
        sess.state.lock().unwrap().incidents.push(Incident { id, t_ms: sess.t(), kind: kind.into(), detail, console, sheet, clip, reviewed: false });
    };

    while started.elapsed() < deadline && !sess.stop.load(Ordering::Relaxed) {
        let tick = Instant::now();
        if capture::stop_key_down() {
            sess.log("stop", "stopped with F8");
            say(q, "playerone: stopped with F8");
            break;
        }

        // console lines
        while let Ok(line) = rx.try_recv() {
            if !noise(&line.text) {
                console_tail.push(format!("{}: {}", line.source, line.text));
            }
            if console_tail.len() > 30 {
                console_tail.remove(0);
            }
            if line.error {
                let key: String = line.text.chars().take(80).collect();
                if !seen_errors.contains(&key) {
                    seen_errors.push(key);
                    sess.log("console", line.text.clone());
                    // give the engine a moment to print the stack trace lines that follow
                    std::thread::sleep(Duration::from_millis(300));
                    while let Ok(more) = rx.try_recv() {
                        if !noise(&more.text) {
                            if !noise(&more.text) {
                        console_tail.push(format!("{}: {}", more.source, more.text));
                    }
                        }
                    }
                    let ctx: Vec<String> = console_tail.iter().rev().take(16).rev().cloned().collect();
                    raise(sess, "console_error", line.text.clone(), ctx, &ring);
                }
            }
        }

        // did the game die
        if let Some(c) = child.as_mut() {
            if let Ok(Some(status)) = c.try_wait() {
                std::thread::sleep(Duration::from_millis(300));
                while let Ok(more) = rx.try_recv() {
                    if !noise(&more.text) {
                        console_tail.push(format!("{}: {}", more.source, more.text));
                    }
                }
                let ctx: Vec<String> = console_tail.iter().rev().take(20).rev().cloned().collect();
                raise(sess, "crash", format!("game process exited ({status})"), ctx, &ring);
                break;
            }
        }

        // capture on a worker with a deadline. a hung game never finishes drawing for us, and we must not hang with it
        if !busy.swap(true, Ordering::Relaxed) {
            let (gtx, busy, ws) = (gtx.clone(), busy.clone(), sess.clone());
            std::thread::spawn(move || {
                let me = capture::foreground_pid() == Some(std::process::id());
                ws.paused.store(me, Ordering::Relaxed);
                let r = capture::find_by_id(win_id).and_then(|w| {
                    if !me && !w.is_focused().unwrap_or(true) {
                        capture::focus(&w);
                    }
                    let rect = (w.x().unwrap_or(0), w.y().unwrap_or(0), w.width().unwrap_or(1), w.height().unwrap_or(1));
                    capture::grab(&w, 640).ok().map(|img| (img, rect))
                });
                let _ = gtx.send(r);
                busy.store(false, Ordering::Relaxed);
            });
        }
        let got = grx.recv_timeout(Duration::from_millis(1500));
        let t = sess.t();
        match got {
            Err(_) => {
                // no frame inside the deadline: the window stopped drawing
                let since = *no_draw_since.get_or_insert(t);
                if !hang_reported && t.saturating_sub(since) > 4000 {
                    hang_reported = true;
                    raise(
                        sess,
                        "hang",
                        "the game window stopped drawing: no frame for 4s and it does not answer paint requests".into(),
                        console_tail.iter().rev().take(8).rev().cloned().collect(),
                        &ring,
                    );
                }
            }
            Ok(None) => {
                no_draw_since = None;
                capture_fail += 1;
                if capture_fail > 20 {
                    raise(sess, "crash", "game window disappeared".into(), console_tail.clone(), &ring);
                    break;
                }
            }
            Ok(Some((img, rect))) => {
                no_draw_since = None;
                capture_fail = 0;
                *sess.rect.lock().unwrap() = rect;
                let changed = prev.as_ref().map(|p| capture::diff(p, &img)).unwrap_or(1.0);
                if changed > 0.003 {
                    last_change = t;
                    stall_reported = false;
                    sess.last_change_ms.store(t, Ordering::Relaxed);
                }
                if let Some(base) = &probe_base {
                    if capture::diff(base, &img) > 0.003 {
                        probe_moved = true;
                    }
                }
                let jpeg = capture::to_jpeg(&img, 70);
                {
                    let mut st = sess.state.lock().unwrap();
                    st.latest = Some(jpeg);
                    st.meter.frames_captured += 1;
                }
                ring.lock().unwrap().push(Frame { t_ms: t, img: img.clone() });
                prev = Some(img);

                // stall: input is going in and nothing on screen moves. probe before calling it a bug
                let since_input = t.saturating_sub(sess.last_input_ms.load(Ordering::Relaxed));
                if probe_started.is_none() && !stall_reported && t.saturating_sub(last_change) > 4000 && since_input < 1500 {
                    probe_started = Some(t);
                    probe_base = prev.clone();
                    probe_moved = false;
                    sess.probe_done.store(false, Ordering::Relaxed);
                    sess.probe_req.store(true, Ordering::Relaxed);
                    sess.log("probe", "screen still for 4s, trying every control once");
                }
            }
        }
        if let Some(ps) = probe_started {
            let done = sess.probe_done.load(Ordering::Relaxed);
            if done || t.saturating_sub(ps) > 9000 {
                std::thread::sleep(Duration::from_millis(300)); // let the last probe frame land
                probe_started = None;
                probe_base = None;
                if probe_moved {
                    sess.log("probe", "the game reacted, it was a dead end, not a bug");
                    last_change = sess.t();
                } else {
                    stall_reported = true;
                    raise(
                        sess,
                        "softlock",
                        "the player is stuck: the screen stayed still for 4s of input and no control had any effect when probed".into(),
                        console_tail.iter().rev().take(8).rev().cloned().collect(),
                        &ring,
                    );
                }
            }
        }

        // the player's own hunch becomes an incident too
        let hunch = {
            let st = sess.state.lock().unwrap();
            st.events.iter().rev().take(5).find(|e| e.kind == "suspicious" && e.t_ms + 600 > sess.t()).map(|e| e.text.clone())
        };
        if let Some(h) = hunch {
            let dup = sess.state.lock().unwrap().incidents.iter().any(|i| i.kind == "player_flag" && i.detail == h);
            if !dup {
                raise(sess, "player_flag", h, vec![], &ring);
            }
        }

        let spent = tick.elapsed();
        if spent < Duration::from_millis(200) {
            std::thread::sleep(Duration::from_millis(200) - spent);
        }
    }

    sess.stop.store(true, Ordering::Relaxed);
    stop_tail.store(true, Ordering::Relaxed);
    if let Err(e) = player_thread.join().unwrap_or(Ok(())) {
        sess.log("error", format!("player stopped: {e}"));
    }
    if let Some(d) = director_thread {
        if let Err(e) = d.join().unwrap_or(Ok(())) {
            sess.log("error", format!("director stopped: {e}"));
        }
    }
    if let Some(mut c) = child {
        let _ = c.kill();
    }

    // standalone with no director: the strong signals become reports on their own
    if cfg.director.is_none() {
        let open: Vec<Incident> = sess.state.lock().unwrap().incidents.iter().filter(|i| !i.reviewed).cloned().collect();
        for i in open {
            let (title, severity) = match i.kind.as_str() {
                "crash" => ("Game crashes".to_string(), "blocker"),
                "hang" => ("Game hangs: the window stops drawing".to_string(), "blocker"),
                "softlock" => ("Player gets soft-locked: no control has any effect".to_string(), "blocker"),
                "console_error" => (format!("Engine error: {}", i.detail.chars().take(90).collect::<String>()), "major"),
                _ => (format!("Needs review: {}", i.detail), "minor"),
            };
            let _ = sess.file_report(
                Verdict {
                    incident: Some(i.id),
                    bug: true,
                    title,
                    severity: severity.into(),
                    steps: repro_steps(&sess, i.t_ms),
                    expected: String::new(),
                    actual: i.detail.clone(),
                },
                "PlayerOne (built-in checks)",
            );
        }
    }
    let n = sess.state.lock().unwrap().reports.len();
    say(q, &format!("playerone: done. {n} reports in {}", cfg.out_dir.join("reports").display()));
    Ok(())
}

fn direct_once(ds: &Arc<Session>, director: &Provider, open: &[Incident], since: u64) -> Result<()> {
    let digest = ds.digest(since);
    let mut sheets = vec![];
    let mut video = None;
    for i in open.iter().take(3) {
        if let Some(p) = &i.sheet {
            if let Ok(b) = std::fs::read(p) {
                sheets.push(b);
            }
        }
        if director.takes_video() && video.is_none() {
            if let Some(c) = &i.clip {
                video = std::fs::read(c).ok();
            }
        }
    }
    if sheets.is_empty() {
        if let Some(j) = ds.state.lock().unwrap().latest.clone() {
            sheets.push(j); // nothing broke yet, show the current screen so it can steer
        }
    }
    let bytes: usize = sheets.iter().map(|s| s.len()).sum::<usize>() + video.as_ref().map(|v| v.len()).unwrap_or(0) + digest.len();
    let (dir, usage) = match agent::direct(director, &digest, &sheets, video.as_deref()) {
        Ok(x) => x,
        Err(e) => {
            ds.log("error", format!("director: {e}"));
            return Ok(());
        }
    };
    {
        let mut st = ds.state.lock().unwrap();
        st.meter.director_calls += 1;
        st.meter.director_tokens.input += usage.input;
        st.meter.director_tokens.output += usage.output;
        st.meter.director_bytes_sent += bytes as u64;
        for i in st.incidents.iter_mut() {
            if open.iter().any(|o| o.id == i.id) {
                i.reviewed = true;
            }
        }
    }
    for v in dir.reports {
        if v.bug {
            let _ = ds.file_report(v, &director.label());
        } else if let Some(id) = v.incident {
            ds.log("dismissed", format!("#{id} judged a false alarm: {}", v.title));
        }
    }
    if let Some(g) = dir.player_goal {
        if !g.trim().is_empty() {
            ds.set_goal(&g);
        }
    }
    if dir.done {
        ds.log("director", "director says the run is done");
    }
    Ok(())
}

/// split a command line, respecting double quotes
pub fn split_cmd(s: &str) -> Vec<String> {
    let mut out = vec![];
    let mut cur = String::new();
    let mut quoted = false;
    for ch in s.chars() {
        match ch {
            '"' => quoted = !quoted,
            ' ' if !quoted => {
                if !cur.is_empty() {
                    out.push(std::mem::take(&mut cur));
                }
            }
            c => cur.push(c),
        }
    }
    if !cur.is_empty() {
        out.push(cur);
    }
    out
}

/// stack frames without symbols are noise in a bug report
fn noise(line: &str) -> bool {
    line.contains("no debug info in PE/COFF") || line.trim().is_empty()
}

/// turn the recorded inputs before an incident into readable steps: runs of the same input get merged
fn repro_steps(sess: &Arc<Session>, until_ms: u64) -> Vec<String> {
    let st = sess.state.lock().unwrap();
    repro_steps_locked(&st, until_ms)
}

fn repro_steps_locked(st: &State, until_ms: u64) -> Vec<String> {
    let acts: Vec<&Event> = st.events.iter().filter(|e| e.kind == "action" && e.t_ms <= until_ms).collect();
    let mut steps: Vec<(String, u32)> = vec![];
    for a in acts {
        let verb = a.text.split_whitespace().take(2).collect::<Vec<_>>().join(" ");
        match steps.last_mut() {
            Some((v, n)) if *v == verb => *n += 1,
            _ => steps.push((verb, 1)),
        }
    }
    let mut out = vec!["Start the game".to_string()];
    let tail: Vec<String> = steps.iter().map(|(v, n)| if *n > 1 { format!("{v} (x{n})") } else { v.clone() }).collect();
    if tail.len() > 10 {
        out.push(format!("Play forward for about {:.0}s ({} input groups, full list in session.json)", until_ms as f32 / 1000.0, tail.len() - 8));
        out.extend(tail[tail.len() - 8..].iter().cloned());
    } else {
        out.extend(tail);
    }
    out.push(format!("The problem shows at about {:.1}s", until_ms as f32 / 1000.0));
    out
}
