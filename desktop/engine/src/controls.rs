//! What the player is allowed to press. PlayerOne recognises the game, suggests a preset,
//! and the user approves it. The AI can only ever use the approved controls.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Control {
    pub key: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Controls {
    pub preset: String,
    pub keys: Vec<Control>,
    /// relative mouse movement for looking around in 3D games
    #[serde(default)]
    pub mouse_look: bool,
    /// clicking inside the game window
    #[serde(default)]
    pub mouse_click: bool,
}

impl Controls {
    pub fn key_names(&self) -> Vec<String> {
        self.keys.iter().map(|c| c.key.clone()).collect()
    }
    /// keys that move the player, used by the explorer bot and the soft-lock probe
    pub fn movement(&self) -> Vec<String> {
        let mv = ["w", "a", "s", "d", "left", "right", "up", "down", "space"];
        self.key_names().into_iter().filter(|k| mv.contains(&k.as_str())).collect()
    }
    pub fn from_keys(keys: &[String]) -> Self {
        Controls { preset: "custom".into(), keys: keys.iter().map(|k| c(k, k)).collect(), mouse_look: false, mouse_click: false }
    }
    pub fn describe(&self) -> String {
        let mut s: Vec<String> = self.keys.iter().map(|k| format!("{} = {}", k.key, k.label)).collect();
        if self.mouse_look {
            s.push("mouse_look = look around".into());
        }
        if self.mouse_click {
            s.push("click = click on screen".into());
        }
        s.join(", ")
    }
}

fn c(key: &str, label: &str) -> Control {
    Control { key: key.into(), label: label.into() }
}

#[derive(Debug, Clone, Serialize)]
pub struct Preset {
    pub id: &'static str,
    pub name: &'static str,
    pub controls: Controls,
}

pub fn presets() -> Vec<Preset> {
    let p = |id: &'static str, name: &'static str, keys: Vec<Control>, look: bool, click: bool| Preset {
        id,
        name,
        controls: Controls { preset: id.into(), keys, mouse_look: look, mouse_click: click },
    };
    vec![
        p("platformer", "2D platformer", vec![c("left", "move left"), c("right", "move right"), c("up", "look up or climb"), c("down", "crouch"), c("space", "jump")], false, false),
        p("first_person", "First-person 3D", vec![c("w", "forward"), c("a", "strafe left"), c("s", "back"), c("d", "strafe right"), c("space", "jump"), c("ctrl", "crouch"), c("shift", "sprint"), c("e", "interact"), c("f", "use item")], true, true),
        p("third_person", "Third-person 3D", vec![c("w", "forward"), c("a", "left"), c("s", "back"), c("d", "right"), c("space", "jump"), c("shift", "run"), c("e", "interact")], true, true),
        p("top_down", "Top-down", vec![c("w", "up"), c("a", "left"), c("s", "down"), c("d", "right"), c("space", "action"), c("e", "interact")], false, true),
        p("point_click", "Point and click", vec![c("escape", "menu")], false, true),
        p("racing", "Racing", vec![c("up", "accelerate"), c("down", "brake"), c("left", "steer left"), c("right", "steer right"), c("space", "handbrake")], false, false),
    ]
}

pub fn preset(id: &str) -> Option<Controls> {
    presets().into_iter().find(|p| p.id == id).map(|p| p.controls)
}

#[derive(Debug, Clone, Serialize)]
pub struct Suggestion {
    pub game: String,
    pub preset: String,
    pub reason: String,
    pub controls: Controls,
}

/// games we know by name. the list grows, everything else falls back to the model or a guess
const KNOWN: &[(&str, &str)] = &[
    ("hello neighbor", "first_person"),
    ("minecraft", "first_person"),
    ("counter-strike", "first_person"),
    ("cs2", "first_person"),
    ("valorant", "first_person"),
    ("doom", "first_person"),
    ("half-life", "first_person"),
    ("portal", "first_person"),
    ("phasmophobia", "first_person"),
    ("subnautica", "first_person"),
    ("hollow knight", "platformer"),
    ("celeste", "platformer"),
    ("cuphead", "platformer"),
    ("terraria", "platformer"),
    ("cavern", "platformer"),
    ("stardew", "top_down"),
    ("hades", "top_down"),
    ("binding of isaac", "top_down"),
    ("among us", "top_down"),
    ("elden ring", "third_person"),
    ("dark souls", "third_person"),
    ("fortnite", "third_person"),
    ("gta", "third_person"),
    ("forza", "racing"),
    ("need for speed", "racing"),
    ("rocket league", "racing"),
    ("monkey island", "point_click"),
    ("solitaire", "point_click"),
];

/// name match first (instant, free), then let a vision model look at the screen, then a safe default
pub fn suggest(title: &str, app: &str, model: Option<&crate::providers::Provider>, frame_jpeg: Option<&[u8]>) -> Suggestion {
    let hay = format!("{} {}", title, app).to_lowercase();
    if let Some((name, id)) = KNOWN.iter().find(|(n, _)| hay.contains(n)) {
        return Suggestion {
            game: title_case(name),
            preset: id.to_string(),
            reason: "recognised from the window title".into(),
            controls: preset(id).unwrap(),
        };
    }
    if let (Some(m), Some(jpeg)) = (model, frame_jpeg) {
        let ids: Vec<&str> = presets().iter().map(|p| p.id).collect();
        let prompt = format!(
            "Window title: \"{title}\". Process: \"{app}\". Look at the screenshot. Which control scheme fits this game best? \
             Choose one of: {}. Reply JSON only: {{\"game\":\"name of the game if you know it\",\"preset\":\"one id\",\"reason\":\"few words\"}}",
            ids.join(", ")
        );
        if let Ok((raw, _)) = m.ask("You identify video games and how they are controlled.", &prompt, &[jpeg.to_vec()], None) {
            if let Some(v) = crate::providers::extract_json(&raw) {
                let id = v["preset"].as_str().unwrap_or_default();
                if let Some(ctrl) = preset(id) {
                    return Suggestion {
                        game: v["game"].as_str().filter(|s| !s.is_empty()).unwrap_or(title).to_string(),
                        preset: id.into(),
                        reason: format!("the AI looked at the screen: {}", v["reason"].as_str().unwrap_or("best match")),
                        controls: ctrl,
                    };
                }
            }
        }
    }
    Suggestion {
        game: title.to_string(),
        preset: "first_person".into(),
        reason: "not recognised, most 3D PC games use this layout. change it if it is wrong".into(),
        controls: preset("first_person").unwrap(),
    }
}

fn title_case(s: &str) -> String {
    s.split(' ').map(|w| {
        let mut c = w.chars();
        c.next().map(|f| f.to_uppercase().collect::<String>() + c.as_str()).unwrap_or_default()
    }).collect::<Vec<_>>().join(" ")
}
