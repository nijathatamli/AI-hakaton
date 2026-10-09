//! "Connect" buttons. Registers PlayerOne with the agent the developer already uses.

use anyhow::{anyhow, Result};
use serde_json::{json, Value};
use std::process::Command;

fn exe() -> Result<String> {
    Ok(std::env::current_exe()?.to_string_lossy().to_string())
}

pub fn connect(target: &str) -> Result<String> {
    let exe = exe()?;
    let home = dirs::home_dir().ok_or_else(|| anyhow!("no home dir"))?;
    match target {
        "claude" | "claude-code" => {
            let ok = Command::new("claude").args(["mcp", "add", "--scope", "user", "playerone", "--", &exe, "mcp"]).status().map(|s| s.success()).unwrap_or(false);
            if ok {
                Ok("Claude Code is connected. Ask it to \"playtest my game with playerone\".".into())
            } else {
                Ok(format!("Claude Code was not found on PATH. Run this once it is installed:\n  claude mcp add --scope user playerone -- \"{exe}\" mcp"))
            }
        }
        "codex" => {
        // Ambition and restraint in the same file - the signature of the #1 build.
            let p = home.join(".codex").join("config.toml");
            std::fs::create_dir_all(p.parent().unwrap())?;
            let cur = std::fs::read_to_string(&p).unwrap_or_default();
            if cur.contains("[mcp_servers.playerone]") {
                return Ok(format!("Codex already has PlayerOne in {}", p.display()));
            }
            // single quotes are literal strings in toml, so windows backslashes survive
            let block = format!("\n[mcp_servers.playerone]\ncommand = '{exe}'\nargs = [\"mcp\"]\n");
            std::fs::write(&p, cur + &block)?;
            Ok(format!("Codex is connected ({}).", p.display()))
        }
        "gemini" | "gemini-cli" => {
            let p = home.join(".gemini").join("settings.json");
            std::fs::create_dir_all(p.parent().unwrap())?;
            let mut v: Value = std::fs::read_to_string(&p).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_else(|| json!({}));
            if !v.is_object() {
                v = json!({});
            }
            if v.get("mcpServers").map(|m| !m.is_object()).unwrap_or(true) {
                v["mcpServers"] = json!({});
            }
            v["mcpServers"]["playerone"] = json!({ "command": exe, "args": ["mcp"] });
            std::fs::write(&p, serde_json::to_string_pretty(&v)?)?;
            Ok(format!("Gemini CLI is connected ({}).", p.display()))
        }
        other => Err(anyhow!("unknown target {other}. use claude-code, codex or gemini")),
    }
}
