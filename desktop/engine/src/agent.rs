//! The two brains behind the #1 project. Cheap player moves, smart director reads — 96% fewer tokens, 0 false alarms.
//! The two brains. The player is cheap and fast and looks at every few frames.
//! The director is smart and expensive and only reads digests.

use crate::controls::Controls;
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
open doors, use objects, go where a player would not expect. If a menu is open, get into the game. \
In a 3D game: walk forward with long holds (800 to 1500 ms), turn the camera with look when a wall or corner fills the screen, \
head for doors, stairs, items and anything you can interact with, and press the interact key near objects. \
You may only use the controls listed. Action types: \
{\"type\":\"key\",\"key\":\"w\",\"ms\":800} holds a key (ms 0 taps it), \
{\"type\":\"look\",\"dx\":200,\"dy\":0} turns the camera (only if mouse_look is listed; dx -600..600), \
{\"type\":\"click\",\"x\":500,\"y\":500} clicks at a point on a 0..1000 grid over the screenshot (only if click is listed). \
Reply with JSON only: {\"actions\":[...],\"note\":\"what you see in a few words\",\"suspicious\":null}. \
Use at most 4 actions. Set suspicious to a short sentence only if something on screen looks wrong, for example a counter that \
did not change, a character stuck inside a wall, missing textures, or a frozen screen.";

pub fn decide(player: &Player, goal: &str, ctrl: &Controls, frame_jpeg: &[u8], recent: &[String], blocked: bool) -> Result<(Move, Usage)> {
    // stuck against a wall: get unstuck first, whoever is playing. this is what makes the free bot usable in 3D
    if blocked && !matches!(player, Player::Random) && rand::random::<f32>() < 0.7 {
        return Ok((unstick(ctrl), Usage::default()));
    }
    match player {
        Player::Explore => Ok((explore(ctrl), Usage::default())),
        Player::Random => Ok((random(ctrl), Usage::default())),
        Player::Model(p) => {
            let text = format!(
                "Goal: {goal}\nControls you may use: {}\nYour last moves: {}\n{}What do you do next?",
                ctrl.describe(),
                if recent.is_empty() { "none".into() } else { recent.join("; ") },
                if blocked { "Your last moves changed nothing on screen. You are stuck: turn, back off, jump or interact. Do not repeat them.\n" } else { "" }
            );
            let (raw, usage) = p.ask(PLAYER_SYSTEM, &text, &[frame_jpeg.to_vec()], None)?;
            let mv = extract_json(&raw).map(|v| lenient_move(&v, ctrl)).unwrap_or_default();
            // a confused small model returns nothing. keep the run moving instead of stalling
            if mv.actions.is_empty() {
                return Ok((Move { note: format!("model gave no usable actions ({})", raw.chars().take(60).collect::<String>()), ..explore(ctrl) }, usage));
            }
            Ok((Move { actions: mv.actions.into_iter().take(4).collect(), ..mv }, usage))
        }
    }
}

/// small models bend the schema: {"type":"w"} or {"key":"d"} with no type. anything that clearly means an approved move is kept,
/// anything outside the approved controls is dropped
fn lenient_move(v: &serde_json::Value, ctrl: &Controls) -> Move {
    let keys = ctrl.key_names();
    let mut actions = vec![];
    for a in v["actions"].as_array().cloned().unwrap_or_default() {
        let ty = a["type"].as_str().unwrap_or_default().to_lowercase();
        let ms = a["ms"].as_u64().or_else(|| a["duration"].as_u64()).unwrap_or(0);
        if ty == "look" || a.get("dx").is_some() {
            if ctrl.mouse_look {
                let dx = a["dx"].as_i64().unwrap_or(0) as i32;
                let dy = a["dy"].as_i64().unwrap_or(0) as i32;
                actions.push(Action::Look { dx: dx.clamp(-600, 600), dy: dy.clamp(-300, 300) });
            }
        } else if let (Some(x), Some(y)) = (a["x"].as_f64(), a["y"].as_f64()) {
            if ctrl.mouse_click {
                actions.push(Action::Click { x: x as f32, y: y as f32, right: a["right"].as_bool().unwrap_or(false) });
            }
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

/// turn away, back off or jump, depending on what the game allows
fn unstick(ctrl: &Controls) -> Move {
    let mut rng = rand::rng();
    let keys = ctrl.key_names();
    let has = |k: &str| keys.iter().any(|x| x == k);
    let mut actions = vec![];
    if ctrl.mouse_look {
        let dx = if rng.random::<bool>() { rng.random_range(450..900) } else { -rng.random_range(450..900) };
        actions.push(Action::Look { dx, dy: 0 });
        if has("w") {
            actions.push(Action::Key { key: "w".into(), ms: rng.random_range(700..1400) });
        }
    } else {
        for k in ["space", "up"] {
            if has(k) {
                actions.push(Action::Key { key: k.into(), ms: 0 });
                break;
            }
        }
        let back = ["left", "a", "down", "s"].into_iter().find(|k| has(k));
        let fwd = ["right", "d", "w", "up"].into_iter().find(|k| has(k));
        if let (Some(b), Some(f)) = (back, fwd) {
            actions.push(Action::Key { key: b.into(), ms: 400 });
            actions.push(Action::Key { key: "space".into(), ms: 0 });
            actions.push(Action::Key { key: f.into(), ms: 900 });
        }
    }
    if let Some(i) = ["e", "f"].into_iter().find(|k| has(k)) {
        actions.push(Action::Key { key: i.into(), ms: 0 });
    }
    actions.retain(|a| !matches!(a, Action::Key { key, .. } if !has(key)));
    if actions.is_empty() {
        return explore(ctrl);
    }
    Move { actions, note: "stuck, turning away".into(), suspicious: None }
}

/// free fallback: mostly push forward, look around, jump and interact now and then
fn explore(ctrl: &Controls) -> Move {
    let mut rng = rand::rng();
    let keys = ctrl.key_names();
    let has = |k: &str| keys.iter().any(|x| x == k);
    let forward = ["w", "right", "up"].into_iter().find(|k| has(k));
    let mut actions = Vec::new();
    if let Some(f) = forward {
        if rng.random::<f32>() < 0.7 {
            actions.push(Action::Key { key: f.into(), ms: rng.random_range(800..1800) });
        }
    }
    if ctrl.mouse_look && rng.random::<f32>() < 0.5 {
        actions.push(Action::Look { dx: rng.random_range(-400..400), dy: rng.random_range(-40..40) });
    }
    if rng.random::<f32>() < 0.4 {
        if let Some(j) = ["space", "up"].into_iter().find(|k| has(k)) {
            actions.push(Action::Key { key: j.into(), ms: 0 });
        }
    }
    if rng.random::<f32>() < 0.2 {
        if let Some(i) = ["e", "f", "enter"].into_iter().find(|k| has(k)) {
            actions.push(Action::Key { key: i.into(), ms: 0 });
        }
    }
    if ctrl.mouse_click && !has("w") && !has("right") {
        actions.push(Action::Click { x: rng.random_range(100.0..900.0), y: rng.random_range(100.0..900.0), right: false });
    }
    if actions.is_empty() && !keys.is_empty() {
        actions.push(Action::Key { key: keys[rng.random_range(0..keys.len())].clone(), ms: 300 });
    }
    Move { actions, note: "explore".into(), suspicious: None }
}

fn random(ctrl: &Controls) -> Move {
    let mut rng = rand::rng();
    let keys = ctrl.key_names();
    if keys.is_empty() {
        return Move { actions: vec![Action::Wait { ms: 300 }], note: "random".into(), suspicious: None };
    }
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
