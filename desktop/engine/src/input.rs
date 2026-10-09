use anyhow::{anyhow, Result};
use enigo::{Button, Coordinate, Direction, Enigo, Key, Keyboard, Mouse, Settings};
use serde::{Deserialize, Serialize};
use std::{thread, time::Duration};

/// what a player model is allowed to do. clicks use a 0..1000 grid over the window
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    Key {
        key: String,
        #[serde(default)]
        ms: u64,
    },
    Click {
        x: f32,
        y: f32,
    },
    Wait {
        ms: u64,
    },
}

impl Action {
    pub fn describe(&self) -> String {
        match self {
            Action::Key { key, ms } if *ms > 0 => format!("hold {key} {ms}ms"),
            Action::Key { key, .. } => format!("tap {key}"),
            Action::Click { x, y } => format!("click ({x:.0},{y:.0})"),
            Action::Wait { ms } => format!("wait {ms}ms"),
        }
    }
}

pub const DEFAULT_KEYS: &[&str] = &["left", "right", "up", "down", "space", "enter", "escape"];

fn parse_key(name: &str) -> Result<Key> {
    let k = name.trim().to_lowercase();
    Ok(match k.as_str() {
        "left" | "arrowleft" => Key::LeftArrow,
        "right" | "arrowright" => Key::RightArrow,
        "up" | "arrowup" => Key::UpArrow,
        "down" | "arrowdown" => Key::DownArrow,
        "space" | " " | "jump" => Key::Space,
        "enter" | "return" => Key::Return,
        "escape" | "esc" => Key::Escape,
        "tab" => Key::Tab,
        "shift" => Key::Shift,
        "ctrl" | "control" => Key::Control,
        "backspace" => Key::Backspace,
        s if s.chars().count() == 1 => Key::Unicode(s.chars().next().unwrap()),
        other => return Err(anyhow!("unknown key {other}")),
    })
}

pub struct Input {
    enigo: Enigo,
}

impl Input {
    pub fn new() -> Result<Self> {
        Ok(Self { enigo: Enigo::new(&Settings::default()).map_err(|e| anyhow!("input init failed: {e:?}"))? })
    }

    /// rect = window position and size on screen, in screen pixels
    pub fn run(&mut self, action: &Action, rect: (i32, i32, u32, u32)) -> Result<()> {
        match action {
            Action::Key { key, ms } => {
                let k = parse_key(key)?;
                if *ms == 0 {
                    self.enigo.key(k, Direction::Click).map_err(|e| anyhow!("{e:?}"))?;
                } else {
                    self.enigo.key(k, Direction::Press).map_err(|e| anyhow!("{e:?}"))?;
                    thread::sleep(Duration::from_millis((*ms).min(2000)));
                    self.enigo.key(k, Direction::Release).map_err(|e| anyhow!("{e:?}"))?;
                }
            }
            Action::Click { x, y } => {
                let (wx, wy, ww, wh) = rect;
                let sx = wx + (x.clamp(0.0, 1000.0) / 1000.0 * ww as f32) as i32;
                let sy = wy + (y.clamp(0.0, 1000.0) / 1000.0 * wh as f32) as i32;
                self.enigo.move_mouse(sx, sy, Coordinate::Abs).map_err(|e| anyhow!("{e:?}"))?;
                self.enigo.button(Button::Left, Direction::Click).map_err(|e| anyhow!("{e:?}"))?;
            }
            Action::Wait { ms } => thread::sleep(Duration::from_millis((*ms).min(3000))),
        }
        Ok(())
    }

    /// let go of everything, so a stopped run never leaves a key held down
    pub fn release_all(&mut self) {
        for k in [Key::LeftArrow, Key::RightArrow, Key::UpArrow, Key::DownArrow, Key::Space, Key::Shift, Key::Control] {
            let _ = self.enigo.key(k, Direction::Release);
        }
    }
}
