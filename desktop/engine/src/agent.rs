//! The two brains. The player is cheap and fast and looks at every few frames.
//! The director is smart and expensive and only reads digests.

use crate::input::Action;
use crate::providers::{extract_json, Provider, Usage};
use anyhow::Result;
use rand::Rng;
use serde::{Deserialize, Serialize};

pub enum Player {
    /// a vision model picks the moves
    Model(Provider),
    /// no model: pushes forward, jumps, sometimes backtracks. our free fallback
    Explore,
    /// uniform random keys. the baseline we have to beat
    Random,
}

impl Player {
    pub fn from_spec(spec: &str) -> Result<Self> {
        Ok(match spec {
            "explore" => Player::Explore,
            "random" => Player::Random,
            other => Player::Model(Provider::from_spec(other)?),
        })
    }
    pub fn label(&self) -> String {
        match self {
            Player::Model(p) => p.label(),
            Player::Explore => "explore".into(),
            Player::Random => "random".into(),
        }
    }
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct Move {
    #[serde(default)]
    pub actions: Vec<Action>,
    #[serde(default)]
    pub note: String,
    /// the player thinks something on screen looks broken
    #[serde(default)]
    pub suspicious: Option<String>,
}

const PLAYER_SYSTEM: &str = "You are the hands of a video game playtester. You see one screenshot of the game. \
Make progress toward the goal and poke at anything that might break: walk into walls, jump at edges, \
collect things, open doors. Coordinates for clicks use a 0..1000 grid over the screenshot. \
Reply with JSON only: {\"actions\":[{\"type\":\"key\",\"key\":\"right\",\"ms\":600}],\"note\":\"what you see in a few words\",\"suspicious\":null}. \
Use at most 4 actions. Hold movement keys with ms between 200 and 1500, tap others with ms 0. \
Set suspicious to a short sentence only if something on screen looks wrong, for example a counter that did not change, \
a character stuck inside a wall, or a frozen screen.";

pub fn decide(player: &Player, goal: &str, keys: &[String], frame_jpeg: &[u8], recent: &[String]) -> Result<(Move, Usage)> {
    match player {
        Player::Explore => Ok((explore(keys), Usage::default())),
        Player::Random => Ok((random(keys), Usage::default())),
        Player::Model(p) => {
            let text = format!(
                "Goal: {goal}\nAllowed keys: {}\nYour last moves: {}\nWhat do you do next?",
                keys.join(", "),
                if recent.is_empty() { "none".into() } else { recent.join("; ") }
            );
            let (raw, usage) = p.ask(PLAYER_SYSTEM, &text, &[frame_jpeg.to_vec()], None)?;
            let mv = extract_json(&raw).map(|v| lenient_move(&v, keys)).unwrap_or_default();
            // a confused small model returns nothing. keep the run moving instead of stalling
            if mv.actions.is_empty() {
                return Ok((Move { note: format!("model gave no actions ({})", raw.chars().take(60).collect::<String>()), ..explore(keys) }, usage));
            }
            Ok((Move { actions: mv.actions.into_iter().take(4).collect(), ..mv }, usage))
        }
    }
}

/// small models bend the schema: {"type":"left"} or {"key":"right"} with no type. accept anything that clearly means a move
fn lenient_move(v: &serde_json::Value, keys: &[String]) -> Move {
    let mut actions = vec![];
    for a in v["actions"].as_array().cloned().unwrap_or_default() {
        let ty = a["type"].as_str().unwrap_or_default().to_lowercase();
        let ms = a["ms"].as_u64().or_else(|| a["duration"].as_u64()).unwrap_or(0);
        if let (Some(x), Some(y)) = (a["x"].as_f64(), a["y"].as_f64()) {
            actions.push(Action::Click { x: x as f32, y: y as f32 });
        } else if ty == "wait" {
            actions.push(Action::Wait { ms: ms.max(200) });
        } else {
            let key = a["key"].as_str().map(|s| s.to_lowercase()).unwrap_or_else(|| ty.clone());
            if keys.iter().any(|k| *k == key) {
                actions.push(Action::Key { key, ms });
            }
        }
    }
    let suspicious = v["suspicious"].as_str().map(String::from).filter(|s| !s.trim().is_empty() && s != "null");
    Move { actions: actions.into_iter().take(4).collect(), note: v["note"].as_str().unwrap_or_default().to_string(), suspicious }
}

fn explore(keys: &[String]) -> Move {
    let mut rng = rand::rng();
    let has = |k: &str| keys.iter().any(|x| x == k);
    let mut actions = Vec::new();
    let r: f32 = rng.random();
    if r < 0.6 && has("right") {
        actions.push(Action::Key { key: "right".into(), ms: rng.random_range(400..1400) });
    } else if r < 0.75 && has("left") {
        actions.push(Action::Key { key: "left".into(), ms: rng.random_range(200..700) });
    }
    if rng.random::<f32>() < 0.45 {
        let jump = if has("space") { "space" } else { "up" };
        actions.push(Action::Key { key: jump.into(), ms: 0 });
        if has("right") {
            actions.push(Action::Key { key: "right".into(), ms: rng.random_range(200..600) });
        }
    }
    if actions.is_empty() {
        actions.push(Action::Key { key: keys[rng.random_range(0..keys.len())].clone(), ms: 300 });
    }
    Move { actions, note: "explore".into(), suspicious: None }
}

fn random(keys: &[String]) -> Move {
    let mut rng = rand::rng();
    let actions = (0..3)
        .map(|_| Action::Key { key: keys[rng.random_range(0..keys.len())].clone(), ms: if rng.random::<bool>() { 0 } else { rng.random_range(100..900) } })
        .collect();
    Move { actions, note: "random".into(), suspicious: None }
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct Verdict {
    #[serde(default)]
    pub incident: Option<u32>,
    #[serde(default)]
    pub bug: bool,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub severity: String,
    #[serde(default)]
    pub steps: Vec<String>,
    #[serde(default)]
    pub expected: String,
    #[serde(default)]
    pub actual: String,
}

#[derive(Debug, Default, Deserialize, Serialize)]
pub struct Direction {
    #[serde(default)]
    pub player_goal: Option<String>,
    #[serde(default)]
    pub reports: Vec<Verdict>,
    #[serde(default)]
    pub done: bool,
}

pub const DIRECTOR_SYSTEM: &str = "You direct an automated playtest of a video game. A cheap player model is playing right now. \
You never see the live game, only a digest: an event log, engine console errors, and for each incident a contact sheet \
(frames from the seconds before the incident, read left to right then top to bottom; the white bar under each tile shows its position in time). \
Some providers also get a short video clip. Decide for every incident whether it is a real bug. Engine console errors and crashes are strong evidence. \
A screen that stopped changing while keys were pressed is a soft-lock or a hang unless the frames show a menu or loading screen. \
Then give the player its next goal in one short sentence, aimed at the parts of the game not yet explored. \
Reply with JSON only: {\"player_goal\":\"...\",\"reports\":[{\"incident\":1,\"bug\":true,\"title\":\"...\",\"severity\":\"blocker|major|minor\",\
\"steps\":[\"...\"],\"expected\":\"...\",\"actual\":\"...\"}],\"done\":false}. Include every incident you were shown, with bug false for false alarms.";

pub fn direct(director: &Provider, digest: &str, sheets: &[Vec<u8>], video: Option<&[u8]>) -> Result<(Direction, Usage)> {
    let (raw, usage) = director.ask(DIRECTOR_SYSTEM, digest, sheets, video)?;
    let d = extract_json(&raw).and_then(|v| serde_json::from_value::<Direction>(v).ok()).unwrap_or_default();
    Ok((d, usage))
}
