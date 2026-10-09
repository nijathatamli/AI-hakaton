use anyhow::{anyhow, Result};
use enigo::{Axis, Button, Coordinate, Direction, Enigo, Key, Keyboard, Mouse, Settings};
use serde::{Deserialize, Serialize};
use std::{thread, time::Duration};

/// what a player can do. click coordinates use a 0..1000 grid over the game window
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
        #[serde(default)]
        right: bool,
    },
    /// relative mouse movement, for looking around in 3D games
    Look {
        dx: i32,
        dy: i32,
    },
    Scroll {
        dy: i32,
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
            Action::Click { x, y, right } => format!("{} ({x:.0},{y:.0})", if *right { "right-click" } else { "click" }),
            Action::Look { dx, dy } => format!("look {dx:+},{dy:+}"),
            Action::Scroll { dy } => format!("scroll {dy:+}"),
            Action::Wait { ms } => format!("wait {ms}ms"),
        }
    }
}

pub const DEFAULT_KEYS: &[&str] = &["left", "right", "up", "down", "space", "enter", "escape"];

/// never pressed, whatever a model asks for: they close the game or reach the OS
const BLOCKED: &[&str] = &["win", "super", "meta", "cmd", "command", "lwin", "rwin", "f4", "delete", "del"];

fn parse_key(name: &str) -> Result<Key> {
    let k = name.trim().to_lowercase();
    if BLOCKED.contains(&k.as_str()) {
        return Err(anyhow!("{k} is blocked"));
    }
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
        "f1" => Key::F1,
        "f2" => Key::F2,
        "f3" => Key::F3,
        "f5" => Key::F5,
        "f6" => Key::F6,
        "f7" => Key::F7,
        "f8" => Key::F8,
        "f9" => Key::F9,
        "f10" => Key::F10,
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
            Action::Click { x, y, right } => {
                // clamped to the window, so a click can never land on the desktop or another app
                let (wx, wy, ww, wh) = rect;
                let sx = wx + (x.clamp(20.0, 980.0) / 1000.0 * ww as f32) as i32;
                let sy = wy + (y.clamp(20.0, 980.0) / 1000.0 * wh as f32) as i32;
                self.enigo.move_mouse(sx, sy, Coordinate::Abs).map_err(|e| anyhow!("{e:?}"))?;
                let b = if *right { Button::Right } else { Button::Left };
                self.enigo.button(b, Direction::Click).map_err(|e| anyhow!("{e:?}"))?;
            }
            Action::Look { dx, dy } => {
                // in small steps, games read raw deltas per frame and a single big jump often gets dropped
                let steps = 8;
                for _ in 0..steps {
                    self.enigo
                        .move_mouse((dx / steps).clamp(-120, 120), (dy / steps).clamp(-80, 80), Coordinate::Rel)
                        .map_err(|e| anyhow!("{e:?}"))?;
                    thread::sleep(Duration::from_millis(12));
                }
            }
            Action::Scroll { dy } => {
                self.enigo.scroll((*dy).clamp(-10, 10), Axis::Vertical).map_err(|e| anyhow!("{e:?}"))?;
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
        for ch in ['w', 'a', 's', 'd'] {
            let _ = self.enigo.key(Key::Unicode(ch), Direction::Release);
        }
    }
}
