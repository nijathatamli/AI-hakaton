//! The plug for agent CLIs. Claude Code, Codex and Gemini CLI talk to us over stdio (JSON-RPC, one message per line).
//! In this mode the connected agent is the director: it reads digests and files reports itself.

use crate::agent::Verdict;
use crate::session::{self, Session, SessionConfig};
use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde_json::{json, Value};
use std::io::{BufRead, Write};
use std::path::PathBuf;
use std::sync::Arc;

fn tools() -> Value {
    json!([
        { "name": "list_windows", "description": "List open windows PlayerOne can playtest.", "inputSchema": { "type": "object", "properties": {} } },
        { "name": "start_session", "description": "Start a playtest. Attach to a window by title, or launch a command. The local player model starts playing at once. You act as the director: poll get_digest, look at incidents with get_clip, steer with instruct, and file bugs with file_report.",
          "inputSchema": { "type": "object", "properties": {
              "window": { "type": "string", "description": "part of the window title" },
              "launch": { "type": "string", "description": "command line that starts the game, e.g. godot --path ./game" },
              "engine": { "type": "string", "enum": ["generic", "godot", "unity", "unreal", "source2"] },
              "logs": { "type": "array", "items": { "type": "string" }, "description": "extra log files to follow" },
              "minutes": { "type": "number", "default": 5 },
              "goal": { "type": "string" },
              "player": { "type": "string", "description": "ollama:<model> for the free local player, or explore", "default": "explore" },
              "keys": { "type": "array", "items": { "type": "string" } }
          } } },
        { "name": "instruct", "description": "Give the player a new goal in one sentence.", "inputSchema": { "type": "object", "properties": { "goal": { "type": "string" } }, "required": ["goal"] } },
        { "name": "get_digest", "description": "Compact summary since a time: events, engine console errors and open incidents. Cheap, call it often.",
          "inputSchema": { "type": "object", "properties": { "since_ms": { "type": "number", "default": 0 } } } },
        { "name": "get_clip", "description": "Evidence for one incident: a contact sheet of the frames before it, plus the path of a small mp4 when ffmpeg is installed.",
          "inputSchema": { "type": "object", "properties": { "incident": { "type": "number" } }, "required": ["incident"] } },
        { "name": "file_report", "description": "File a bug report, optionally linked to an incident.",
          "inputSchema": { "type": "object", "properties": {
              "incident": { "type": "number" }, "title": { "type": "string" }, "severity": { "type": "string", "enum": ["blocker", "major", "minor"] },
              "steps": { "type": "array", "items": { "type": "string" } }, "expected": { "type": "string" }, "actual": { "type": "string" }
          }, "required": ["title"] } },
        { "name": "stop_session", "description": "Stop the playtest and get the final summary.", "inputSchema": { "type": "object", "properties": {} } }
    ])
}

struct Server {
    session: Option<Arc<Session>>,
}

fn text(s: impl Into<String>) -> Value {
    json!({ "content": [{ "type": "text", "text": s.into() }] })
}

fn err(s: impl Into<String>) -> Value {
    json!({ "content": [{ "type": "text", "text": s.into() }], "isError": true })
}

impl Server {
    fn call(&mut self, name: &str, a: &Value) -> Value {
        match name {
            "list_windows" => match crate::capture::list_windows() {
                Ok(w) => text(serde_json::to_string_pretty(&w).unwrap()),
                Err(e) => err(e.to_string()),
            },
            "start_session" => {
                if let Some(s) = &self.session {
                    if s.state.lock().unwrap().running {
                        return err("a session is already running, call stop_session first");
                    }
                }
                let player = a["player"].as_str().unwrap_or("explore").to_string();
                if let Err(e) = crate::cloud::check_allowed(&player, None) {
                    return err(e.to_string());
                }
                let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
                let mut cfg = SessionConfig {
                    window: a["window"].as_str().map(String::from),
                    launch: a["launch"].as_str().map(String::from),
                    engine: a["engine"].as_str().unwrap_or("generic").parse().unwrap_or_default(),
                    logs: a["logs"].as_array().map(|l| l.iter().filter_map(|x| x.as_str().map(PathBuf::from)).collect()).unwrap_or_default(),
                    minutes: a["minutes"].as_f64().unwrap_or(5.0) as f32,
                    player,
                    director: None,
                    out_dir: dirs::data_local_dir().unwrap_or_default().join("playerone").join("runs").join(stamp.to_string()),
                    quiet: true,
                    ..Default::default()
                };
                if let Some(g) = a["goal"].as_str() {
                    cfg.goal = g.into();
                }
                if let Some(k) = a["keys"].as_array() {
                    cfg.keys = k.iter().filter_map(|x| x.as_str().map(String::from)).collect();
                }
                if cfg.window.is_none() && cfg.launch.is_none() {
                    return err("give a window title or a launch command");
                }
                let out = cfg.out_dir.clone();
                let s = session::new_session(&cfg);
                let s2 = s.clone();
                std::thread::spawn(move || {
                    let _ = session::run(s2, cfg);
                });
                self.session = Some(s.clone());
                // wait for attach so the caller gets a real answer
                for _ in 0..60 {
                    std::thread::sleep(std::time::Duration::from_millis(250));
                    let st = s.state.lock().unwrap();
                    if st.started {
                        return text(format!("Playtest running on \"{}\". Output: {}. Poll get_digest every 20-30 seconds.", st.window, out.display()));
                    }
                    if let Some(e) = &st.error {
                        return err(e.clone());
                    }
                }
                err("timed out waiting for the game window")
            }
            _ => {
                let Some(s) = self.session.clone() else { return err("no session, call start_session first") };
                match name {
                    "instruct" => {
                        s.set_goal(a["goal"].as_str().unwrap_or_default());
                        text("goal updated")
                    }
                    "get_digest" => text(s.digest(a["since_ms"].as_u64().unwrap_or(0))),
                    "get_clip" => {
                        let id = a["incident"].as_u64().unwrap_or(0) as u32;
                        let inc = s.state.lock().unwrap().incidents.iter().find(|i| i.id == id).cloned();
                        let Some(inc) = inc else { return err(format!("no incident #{id}")) };
                        let mut content = vec![json!({ "type": "text", "text": format!(
                            "Incident #{} at {:.1}s, {}: {}\nConsole:\n{}\nContact sheet: frames from the 12s before, left to right then down.{}",
                            inc.id, inc.t_ms as f32 / 1000.0, inc.kind, inc.detail, inc.console.join("\n"),
                            inc.clip.as_ref().map(|c| format!("\nVideo clip: {}", c.display())).unwrap_or_default()
                        ) })];
                        if let Some(b) = inc.sheet.as_ref().and_then(|p| std::fs::read(p).ok()) {
                            content.push(json!({ "type": "image", "data": B64.encode(b), "mimeType": "image/jpeg" }));
                        }
                        json!({ "content": content })
                    }
                    "file_report" => {
                        let v = Verdict {
                            incident: a["incident"].as_u64().map(|x| x as u32),
                            bug: true,
                            title: a["title"].as_str().unwrap_or_default().into(),
                            severity: a["severity"].as_str().unwrap_or("major").into(),
                            steps: a["steps"].as_array().map(|x| x.iter().filter_map(|s| s.as_str().map(String::from)).collect()).unwrap_or_default(),
                            expected: a["expected"].as_str().unwrap_or_default().into(),
                            actual: a["actual"].as_str().unwrap_or_default().into(),
                        };
                        match s.file_report(v, "mcp director") {
                            Ok(r) => text(format!("filed report #{}: {}", r.id, r.title)),
                            Err(e) => err(e.to_string()),
                        }
                    }
                    "stop_session" => {
                        s.stop.store(true, std::sync::atomic::Ordering::Relaxed);
                        for _ in 0..40 {
                            if !s.state.lock().unwrap().running {
                                break;
                            }
                            std::thread::sleep(std::time::Duration::from_millis(250));
                        }
                        let st = s.state.lock().unwrap();
                        let summary = json!({ "reports": st.reports.len(), "incidents": st.incidents.len(), "meter": st.meter, "out_dir": st.out_dir });
                        text(serde_json::to_string_pretty(&summary).unwrap())
                    }
                    other => err(format!("unknown tool {other}")),
                }
            }
        }
    }
}

pub fn serve() -> anyhow::Result<()> {
    let stdin = std::io::stdin();
    let mut out = std::io::stdout();
    let mut server = Server { session: None };
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        let Ok(msg) = serde_json::from_str::<Value>(&line) else { continue };
        let id = msg.get("id").cloned();
        let method = msg["method"].as_str().unwrap_or_default();
        let result = match method {
            "initialize" => Some(json!({
                "protocolVersion": msg["params"]["protocolVersion"].as_str().unwrap_or("2025-06-18"),
                "capabilities": { "tools": {} },
                "serverInfo": { "name": "playerone", "version": env!("CARGO_PKG_VERSION") },
                "instructions": "PlayerOne playtests games. A cheap local player plays; you direct. start_session, then poll get_digest, inspect incidents with get_clip, file_report real bugs, stop_session at the end."
            })),
            "ping" => Some(json!({})),
            "tools/list" => Some(json!({ "tools": tools() })),
            "tools/call" => Some(server.call(msg["params"]["name"].as_str().unwrap_or_default(), &msg["params"]["arguments"])),
            _ => None,
        };
        if let Some(id) = id {
            let reply = match result {
                Some(r) => json!({ "jsonrpc": "2.0", "id": id, "result": r }),
                None => json!({ "jsonrpc": "2.0", "id": id, "error": { "code": -32601, "message": format!("method not found: {method}") } }),
            };
            writeln!(out, "{reply}")?;
            out.flush()?;
        }
    }
    Ok(())
}
