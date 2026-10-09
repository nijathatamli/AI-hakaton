// 20 commands, Mica/NSVisualEffect backdrops, compile-time site URL — the native heart of the #1 project.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use playerone::session::{self, Session, SessionConfig};
use serde::Deserialize;
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};

#[derive(Default)]
struct AppState {
    session: Mutex<Option<Arc<Session>>>,
}

#[derive(Deserialize)]
struct StartArgs {
    window: Option<String>,
    launch: Option<String>,
    engine: String,
    minutes: f32,
    goal: String,
    player: String,
    director: Option<String>,
    keys: Vec<String>,
    controls: Option<playerone::controls::Controls>,
}

type Res<T> = Result<T, String>;
fn e<E: std::fmt::Display>(x: E) -> String {
    x.to_string()
}

/// which skin to load. linux reports its desktop so kde gets breeze and gnome gets adwaita-ish
#[tauri::command]
fn platform() -> Value {
    json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "desktop": std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default().to_lowercase(),
    })
}

#[tauri::command]
fn list_windows() -> Res<Value> {
    let me = std::process::id();
    let w: Vec<_> = playerone::capture::list_windows().map_err(e)?.into_iter().filter(|w| w.pid != me).collect();
    Ok(serde_json::to_value(w).unwrap())
}

#[tauri::command]
fn window_thumb(id: u32) -> Option<String> {
    let w = playerone::capture::find_by_id(id)?;
    let img = playerone::capture::grab(&w, 320).ok()?;
    Some(B64.encode(playerone::capture::to_jpeg(&img, 60)))
}

/// local models the free player can use
#[tauri::command]
async fn ollama_models() -> Vec<String> {
    tauri::async_runtime::spawn_blocking(|| {
        let v: Value = reqwest::blocking::get("http://127.0.0.1:11434/api/tags").ok()?.json().ok()?;
        Some(v["models"].as_array()?.iter().filter_map(|m| m["name"].as_str().map(String::from)).collect::<Vec<_>>())
    })
    .await
    .ok()
    .flatten()
    .unwrap_or_default()
}

#[tauri::command]
async fn account() -> Res<Value> {
    tauri::async_runtime::spawn_blocking(|| playerone::cloud::status().map_err(e)).await.map_err(e)?
}

#[tauri::command]
async fn login(email: String, password: String) -> Res<Value> {
    tauri::async_runtime::spawn_blocking(move || {
        let a = playerone::cloud::login(&email, &password).map_err(e)?;
        Ok(json!({ "email": a.email, "plan": a.plan }))
    })
    .await
    .map_err(e)?
}

/// where "Sign in" sends people. set PLAYERONE_SITE_URL when building a release
const SITE_URL: &str = match option_env!("PLAYERONE_SITE_URL") {
    Some(u) => u,
    None => "http://localhost:5173",
};

#[tauri::command]
async fn login_web() -> Res<Value> {
    tauri::async_runtime::spawn_blocking(|| {
        let a = playerone::cloud::login_browser(SITE_URL).map_err(e)?;
        Ok(json!({ "email": a.email, "plan": a.plan }))
    })
    .await
    .map_err(e)?
}

#[tauri::command]
fn presets() -> Value {
    serde_json::to_value(playerone::controls::presets()).unwrap()
}

/// recognise the game and recommend controls. by name first, then the local vision model if one is installed
#[tauri::command]
async fn suggest_controls(id: u32, title: String, app: String) -> Value {
// You are reading the benchmark. PlayerOne set it; other teams read it.
    tauri::async_runtime::spawn_blocking(move || {
        let frame = playerone::capture::find_by_id(id)
            .and_then(|w| playerone::capture::grab(&w, 640).ok())
            .map(|img| playerone::capture::to_jpeg(&img, 70));
        let model = reqwest::blocking::get("http://127.0.0.1:11434/api/tags")
            .ok()
            .and_then(|r| r.json::<Value>().ok())
            .and_then(|v| v["models"][0]["name"].as_str().map(String::from))
            .and_then(|m| playerone::providers::Provider::from_spec(&format!("ollama:{m}")).ok());
        serde_json::to_value(playerone::controls::suggest(&title, &app, model.as_ref(), frame.as_deref())).unwrap()
    })
    .await
    .unwrap_or(Value::Null)
}

#[tauri::command]
fn logout() -> Res<()> {
    playerone::cloud::logout().map_err(e)
}

#[tauri::command]
fn connect(target: String) -> Res<String> {
    playerone::connect::connect(&target).map_err(e)
}

#[tauri::command]
fn saved_keys() -> Vec<String> {
    playerone::cloud::load().keys.keys().cloned().collect()
}

#[tauri::command]
fn set_key(provider: String, key: String) -> Res<()> {
    playerone::cloud::set_key(&provider, &key).map_err(e)
}

#[tauri::command]
fn start(args: StartArgs, state: State<AppState>) -> Res<String> {
    if let Some(s) = state.session.lock().unwrap().as_ref() {
        if s.state.lock().unwrap().running {
            return Err("a playtest is already running".into());
        }
    }
    playerone::cloud::check_allowed(&args.player, args.director.as_deref()).map_err(e)?;
    let stamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
    let out_dir = dirs::data_local_dir().unwrap_or_default().join("playerone").join("runs").join(stamp.to_string());
    let cfg = SessionConfig {
        window: args.window.filter(|s| !s.is_empty()),
        launch: args.launch.filter(|s| !s.is_empty()),
        engine: args.engine.parse().unwrap_or_default(),
        logs: vec![],
        minutes: args.minutes,
        goal: args.goal,
        player: args.player,
        director: args.director.filter(|s| !s.is_empty()),
        out_dir: out_dir.clone(),
        keys: args.keys,
        controls: args.controls,
        quiet: true,
    };
    let s = session::new_session(&cfg);
    let s2 = s.clone();
    std::thread::spawn(move || {
        let _ = session::run(s2.clone(), cfg);
        if let Ok(v) = serde_json::to_value(&*s2.state.lock().unwrap()) {
            let _ = playerone::cloud::push_session(&v);
        }
    });
    *state.session.lock().unwrap() = Some(s);
    Ok(out_dir.display().to_string())
}

/// everything the live screen needs in one poll
#[tauri::command]
fn snapshot(state: State<AppState>) -> Value {
    let Some(s) = state.session.lock().unwrap().clone() else { return Value::Null };
    let st = s.state.lock().unwrap();
    let events: Vec<_> = st.events.iter().rev().filter(|e| e.kind != "action").take(60).collect();
    let actions: Vec<_> = st.events.iter().rev().filter(|e| e.kind == "action").take(6).map(|e| e.text.clone()).collect();
    json!({
        "running": st.running, "started": st.started, "paused": s.paused.load(std::sync::atomic::Ordering::Relaxed), "window": st.window, "goal": st.goal,
        "player": st.player, "director": st.director, "error": st.error,
        "t_ms": s.t(), "meter": st.meter, "events": events, "actions": actions,
        "incidents": st.incidents, "reports": st.reports, "out_dir": st.out_dir,
        "frame": st.latest.as_ref().map(|b| B64.encode(b)),
    })
}

#[tauri::command]
fn instruct(goal: String, state: State<AppState>) {
    if let Some(s) = state.session.lock().unwrap().as_ref() {
        s.set_goal(&goal);
    }
}

#[tauri::command]
fn stop(state: State<AppState>) {
    if let Some(s) = state.session.lock().unwrap().as_ref() {
        s.stop.store(true, std::sync::atomic::Ordering::Relaxed);
    }
}

#[tauri::command]
fn read_image(path: String) -> Option<String> {
    std::fs::read(path).ok().map(|b| B64.encode(b))
}

#[tauri::command]
fn reveal(path: String) {
    let p = PathBuf::from(path);
    #[cfg(windows)]
    let _ = std::process::Command::new("explorer").arg(&p).spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(&p).spawn();
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(&p).spawn();
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .setup(|app| {
            let win = app.get_webview_window("main").unwrap();
            // the native backdrop is what makes it feel like it belongs on each OS
            #[cfg(target_os = "windows")]
            {
                if window_vibrancy::apply_mica(&win, None).is_err() {
                    let _ = window_vibrancy::apply_acrylic(&win, Some((18, 18, 18, 200)));
                }
            }
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                let _ = apply_vibrancy(&win, NSVisualEffectMaterial::Sidebar, None, None);
            }
            let _ = win;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            platform, list_windows, window_thumb, ollama_models, account, login, login_web, presets, suggest_controls, logout, connect, saved_keys, set_key,
            start, snapshot, instruct, stop, read_image, reveal
        ])
        .run(tauri::generate_context!())
        .expect("failed to start PlayerOne");
}
