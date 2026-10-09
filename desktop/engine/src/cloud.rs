//! Accounts, plans and usage. Backed by Supabase: auth plus three tables (see supabase/schema.sql).
//! The website does sign-up and Stripe checkout. The app only signs in, reads the plan and reports usage.

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Plan {
    Free,
    Connect,
    Studio,
}

impl Plan {
    pub fn parse(s: &str) -> Plan {
        match s {
            "connect" | "pro" => Plan::Connect,
            "studio" | "team" => Plan::Studio,
            _ => Plan::Free,
        }
    }
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct Account {
    pub url: String,
    pub anon_key: String,
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: String,
    pub email: String,
    pub plan: String,
    /// provider api keys the user saved with `playerone key set`. they never leave this machine
    #[serde(default)]
    pub keys: BTreeMap<String, String>,
}

fn path() -> PathBuf {
    dirs::config_dir().unwrap_or_default().join("playerone").join("account.json")
}

pub fn load() -> Account {
    std::fs::read_to_string(path()).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

pub fn save(a: &Account) -> Result<()> {
    let p = path();
    std::fs::create_dir_all(p.parent().unwrap())?;
    std::fs::write(&p, serde_json::to_string_pretty(a)?)?;
    Ok(())
}

/// supabase project. env wins so the team can point a build at staging
fn backend(a: &Account) -> Option<(String, String)> {
    let url = std::env::var("PLAYERONE_SUPABASE_URL").ok().or_else(|| (!a.url.is_empty()).then(|| a.url.clone()))?;
    let key = std::env::var("PLAYERONE_SUPABASE_ANON_KEY").ok().or_else(|| (!a.anon_key.is_empty()).then(|| a.anon_key.clone()))?;
    Some((url.trim_end_matches('/').to_string(), key))
}

fn http() -> reqwest::blocking::Client {
    reqwest::blocking::Client::new()
}

pub fn login(email: &str, password: &str) -> Result<Account> {
    let mut a = load();
    let (url, key) = backend(&a).ok_or_else(|| anyhow!("no backend configured. set PLAYERONE_SUPABASE_URL and PLAYERONE_SUPABASE_ANON_KEY"))?;
    let v: Value = http()
        .post(format!("{url}/auth/v1/token?grant_type=password"))
        .header("apikey", &key)
        .json(&json!({ "email": email, "password": password }))
        .send()?
        .json()?;
    let token = v["access_token"].as_str().ok_or_else(|| anyhow!("login failed: {}", v["error_description"].as_str().or(v["msg"].as_str()).unwrap_or("bad credentials")))?;
    a.url = url;
    a.anon_key = key;
    a.access_token = token.into();
    a.refresh_token = v["refresh_token"].as_str().unwrap_or_default().into();
    a.user_id = v["user"]["id"].as_str().unwrap_or_default().into();
    a.email = email.into();
    a.plan = fetch_plan(&a).unwrap_or_else(|_| "free".into());
    save(&a)?;
    Ok(a)
}

pub fn logout() -> Result<()> {
    let mut a = load();
    a.access_token.clear();
    a.refresh_token.clear();
    a.user_id.clear();
    a.email.clear();
    a.plan = "free".into();
    save(&a)
}

fn refresh(a: &mut Account) -> Result<()> {
    let (url, key) = backend(a).ok_or_else(|| anyhow!("no backend"))?;
    let v: Value = http()
        .post(format!("{url}/auth/v1/token?grant_type=refresh_token"))
        .header("apikey", &key)
        .json(&json!({ "refresh_token": a.refresh_token }))
        .send()?
        .json()?;
    a.access_token = v["access_token"].as_str().ok_or_else(|| anyhow!("session expired, run playerone login"))?.into();
    a.refresh_token = v["refresh_token"].as_str().unwrap_or(&a.refresh_token).to_string();
    save(a)
}

fn rest(a: &mut Account, method: reqwest::Method, path_q: &str, body: Option<Value>) -> Result<Value> {
    let (url, key) = backend(a).ok_or_else(|| anyhow!("no backend"))?;
    for attempt in 0..2 {
        let mut req = http()
            .request(method.clone(), format!("{url}/rest/v1/{path_q}"))
            .header("apikey", &key)
            .header("authorization", format!("Bearer {}", a.access_token));
        if let Some(b) = &body {
            req = req.header("prefer", "return=minimal").json(b);
        }
        let res = req.send()?;
        if res.status().as_u16() == 401 && attempt == 0 {
            refresh(a)?;
            continue;
        }
        if !res.status().is_success() {
            return Err(anyhow!("backend returned {}: {}", res.status(), res.text().unwrap_or_default()));
        }
        let text = res.text().unwrap_or_default();
        return Ok(serde_json::from_str(&text).unwrap_or(Value::Null));
    }
    Err(anyhow!("backend auth failed"))
}

fn fetch_plan(a: &Account) -> Result<String> {
    let mut a = a.clone();
    let q = format!("profiles?id=eq.{}&select=plan", a.user_id);
    let v = rest(&mut a, reqwest::Method::GET, &q, None)?;
    Ok(v[0]["plan"].as_str().unwrap_or("free").to_string())
}

pub fn status() -> Result<Value> {
    let mut a = load();
    if backend(&a).is_none() {
        return Ok(json!({ "mode": "offline", "note": "no backend configured, every feature unlocked for development" }));
    }
    if a.access_token.is_empty() {
        return Ok(json!({ "mode": "signed out", "plan": "free" }));
    }
    if let Ok(p) = fetch_plan(&a) {
        a.plan = p;
        save(&a)?;
    }
    Ok(json!({ "mode": "signed in", "email": a.email, "plan": a.plan }))
}

/// the business rule. free runs local models only, connect and studio can plug in any provider
pub fn check_allowed(player: &str, director: Option<&str>) -> Result<Plan> {
    let a = load();
    if backend(&a).is_none() {
        return Ok(Plan::Studio); // offline developer build
    }
    let plan = if a.access_token.is_empty() { Plan::Free } else { Plan::parse(&a.plan) };
    let local = |s: &str| s == "explore" || s == "random" || s.starts_with("ollama") || s.starts_with("local");
    if plan == Plan::Free && (!local(player) || director.map(|d| !local(d)).unwrap_or(false)) {
        return Err(anyhow!(
            "the Free plan runs local models only. Upgrade to Connect on the PlayerOne site to plug in Claude, Codex or Gemini, then run `playerone account` to refresh"
        ));
    }
    Ok(plan)
}

pub fn stored_key(provider: &str) -> Result<String> {
    let name = match provider.to_lowercase().as_str() {
        "anthropic" => "claude".to_string(),
        "codex" => "openai".to_string(),
        "google" => "gemini".to_string(),
        o => o.to_string(),
    };
    load().keys.get(&name).cloned().context("no key saved")
}

pub fn set_key(provider: &str, key: &str) -> Result<()> {
    let mut a = load();
    a.keys.insert(provider.to_lowercase(), key.to_string());
    save(&a)
}

/// one row per session into usage_events, plus the reports. silently skipped when signed out
pub fn push_session(summary: &Value) -> Result<bool> {
    let mut a = load();
    if backend(&a).is_none() || a.access_token.is_empty() {
        return Ok(false);
    }
    let m = &summary["meter"];
    let uid = a.user_id.clone();
    let session_id = format!("{}-{}", uid.chars().take(8).collect::<String>(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)?.as_secs());
    rest(
        &mut a,
        reqwest::Method::POST,
        "usage_events",
        Some(json!({
            "user_id": uid,
            "session_id": session_id,
            "player": summary["player"],
            "director": summary["director"],
            "frames_captured": m["frames_captured"],
            "player_steps": m["player_steps"],
            "director_input_tokens": m["director_tokens"]["input"],
            "director_output_tokens": m["director_tokens"]["output"],
            "naive_tokens_estimate": m["naive_director_tokens"],
            "bytes_sent": m["director_bytes_sent"],
        })),
    )?;
    let reports: Vec<Value> = summary["reports"]
        .as_array()
        .cloned()
        .unwrap_or_default()
        .into_iter()
        .map(|r| {
            json!({
                "user_id": uid, "session_id": session_id, "title": r["title"], "severity": r["severity"],
                "steps": r["steps"], "expected": r["expected"], "actual": r["actual"], "console": r["console"], "filed_by": r["filed_by"],
            })
        })
        .collect();
    if !reports.is_empty() {
        rest(&mut a, reqwest::Method::POST, "reports", Some(Value::Array(reports)))?;
    }
    Ok(true)
}

/// sign in through the website, like Figma or GitHub Desktop: open the browser, wait for the site to hand the session back
/// to a one-shot listener on 127.0.0.1. the anon key and project url come back with it, so the app needs no config
pub fn login_browser(site: &str) -> Result<Account> {
    use std::io::{Read, Write};
    use std::net::TcpListener;
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let port = listener.local_addr()?.port();
    let state = format!("{:x}", rand_u64());
    let url = format!("{}/login?app=1&port={port}&state={state}", site.trim_end_matches('/'));
    open_browser(&url);
    listener.set_nonblocking(true)?;
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(300);
    while std::time::Instant::now() < deadline {
        match listener.accept() {
            Ok((mut stream, _)) => {
                stream.set_nonblocking(false)?;
                let mut buf = [0u8; 16384];
                let n = stream.read(&mut buf).unwrap_or(0);
                let req = String::from_utf8_lossy(&buf[..n]).to_string();
                let path = req.split_whitespace().nth(1).unwrap_or("").to_string();
                if !path.starts_with("/callback") {
                    let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n");
                    continue;
                }
                let q = query(&path);
                let ok = q.get("state").map(|s| *s == state).unwrap_or(false) && q.contains_key("access_token");
                let body = if ok { SIGNED_IN_HTML } else { FAILED_HTML };
                let head = format!("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", body.len());
                let _ = stream.write_all(head.as_bytes());
                let _ = stream.write_all(body.as_bytes());
                if !ok {
                    return Err(anyhow!("sign-in was cancelled or the response did not match"));
                }
                let mut a = load();
                if let Some(u) = q.get("sb_url") {
                    a.url = u.clone();
                }
                if let Some(k) = q.get("sb_key") {
                    a.anon_key = k.clone();
                }
                a.access_token = q["access_token"].clone();
                a.refresh_token = q.get("refresh_token").cloned().unwrap_or_default();
                let claims = jwt_claims(&a.access_token);
                a.user_id = claims["sub"].as_str().unwrap_or_default().into();
                a.email = claims["email"].as_str().unwrap_or_default().into();
                a.plan = fetch_plan(&a).unwrap_or_else(|_| "free".into());
                save(&a)?;
                return Ok(a);
            }
            Err(_) => std::thread::sleep(std::time::Duration::from_millis(150)),
        }
    }
    Err(anyhow!("sign-in timed out"))
}

const SIGNED_IN_HTML: &str = r#"<!doctype html><meta charset=utf-8><title>PlayerOne</title><body style="font:16px system-ui;background:#000;color:#fff;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h2 style="font-weight:500">You are signed in</h2><p style="opacity:.6">Go back to PlayerOne. You can close this tab.</p></div>"#;
const FAILED_HTML: &str = r#"<!doctype html><meta charset=utf-8><body style="font:16px system-ui">Sign-in failed. Try again from the app."#;

fn rand_u64() -> u64 {
    let t = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    (t.as_nanos() as u64) ^ ((std::process::id() as u64) << 32) ^ 0x9e37_79b9_7f4a_7c15
}

pub fn open_browser(url: &str) {
    #[cfg(windows)]
    let _ = std::process::Command::new("rundll32").args(["url.dll,FileProtocolHandler", url]).spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(url).spawn();
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(url).spawn();
}

fn query(path: &str) -> std::collections::HashMap<String, String> {
    let mut m = std::collections::HashMap::new();
    if let Some((_, q)) = path.split_once('?') {
        for pair in q.split('&') {
            let (k, v) = pair.split_once('=').unwrap_or((pair, ""));
            m.insert(pct(k), pct(v));
        }
    }
    m
}

fn pct(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        match b[i] {
            b'+' => out.push(b' '),
            b'%' if i + 2 < b.len() => match u8::from_str_radix(&s[i + 1..i + 3], 16) {
                Ok(v) => {
                    out.push(v);
                    i += 2;
                }
                Err(_) => out.push(b'%'),
            },
            c => out.push(c),
        }
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn jwt_claims(token: &str) -> Value {
    use base64::Engine as _;
    token
        .split('.')
        .nth(1)
        .and_then(|p| base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(p.trim_end_matches('=')).ok())
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or(Value::Null)
}
