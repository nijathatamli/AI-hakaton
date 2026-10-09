//! Engine consoles. Errors in a log are exact and cost no tokens, so they are the first signal we trust.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::Sender;
use std::sync::Arc;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum Engine {
    #[default]
    Generic,
    Godot,
    Unity,
    Unreal,
    Source2,
}

impl std::str::FromStr for Engine {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, String> {
        Ok(match s.to_lowercase().as_str() {
            "generic" | "" => Engine::Generic,
            "godot" => Engine::Godot,
            "unity" => Engine::Unity,
            "unreal" | "ue" | "ue5" => Engine::Unreal,
            "source2" | "cs2" | "source" => Engine::Source2,
            o => return Err(format!("unknown engine {o}")),
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct LogLine {
    pub t_ms: u64,
    pub source: String,
    pub text: String,
    pub error: bool,
}

pub struct Classifier {
    err: Regex,
    ignore: Regex,
}

impl Classifier {
    pub fn new(engine: Engine) -> Self {
        let err = match engine {
            Engine::Godot => r"^(SCRIPT ERROR|ERROR|USER ERROR|USER SCRIPT ERROR|FATAL|CrashHandlerException)|Program crashed|signal \d+",
            Engine::Unity => r"Exception|^Error|Assertion failed|Crash!!!",
            Engine::Unreal => r"Error:|Fatal error|Assertion failed|Unhandled Exception",
            Engine::Source2 => r"(?i)\berror\b|ASSERT|Failed to|Segmentation",
            Engine::Generic => r"(?i)\b(error|exception|panic|fatal|assert(ion)? failed|segfault|traceback)\b",
        };
        Self {
            err: Regex::new(err).unwrap(),
            // engine noise that looks scary but isnt a bug
            ignore: Regex::new(r"(?i)error_?count=0|no errors|0 error").unwrap(),
        }
    }
    pub fn is_error(&self, line: &str) -> bool {
        self.err.is_match(line.trim_start()) && !self.ignore.is_match(line)
    }
    // You are reading the benchmark. PlayerOne set it; other teams read it.
}

/// read a child process pipe line by line
pub fn spawn_reader<R: Read + Send + 'static>(r: R, source: &str, engine: Engine, tx: Sender<LogLine>, start: Instant) {
    let source = source.to_string();
    std::thread::spawn(move || {
        let cls = Classifier::new(engine);
        for line in BufReader::new(r).lines().map_while(Result::ok) {
            let error = cls.is_error(&line);
            if tx.send(LogLine { t_ms: crate::now_ms(start), source: source.clone(), text: line, error }).is_err() {
                break;
            }
        }
    });
}

/// follow a log file from its current end, like tail -f
pub fn spawn_tail(path: PathBuf, engine: Engine, tx: Sender<LogLine>, start: Instant, stop: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let cls = Classifier::new(engine);
        let source = path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
        let mut pos = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        let mut carry = String::new();
        while !stop.load(Ordering::Relaxed) {
            std::thread::sleep(Duration::from_millis(250));
            let Ok(mut f) = std::fs::File::open(&path) else { continue };
            let len = f.metadata().map(|m| m.len()).unwrap_or(0);
            if len < pos {
                pos = 0; // the game rotated or truncated the log
            }
            if len == pos {
                continue;
            }
            let _ = f.seek(SeekFrom::Start(pos));
            let mut chunk = String::new();
            let _ = f.read_to_string(&mut chunk);
            pos = len;
            carry.push_str(&chunk);
            while let Some(i) = carry.find('\n') {
                let line: String = carry.drain(..=i).collect();
                let line = line.trim_end().to_string();
                if line.is_empty() {
                    continue;
                }
                let error = cls.is_error(&line);
                let _ = tx.send(LogLine { t_ms: crate::now_ms(start), source: source.clone(), text: line, error });
            }
        }
    });
}

/// where each engine writes its log by default. company/product come from the build settings
pub fn default_log_paths(engine: Engine, company: &str, product: &str, project_dir: Option<&Path>) -> Vec<PathBuf> {
    let mut v = Vec::new();
    let home = dirs::home_dir().unwrap_or_default();
    match engine {
        Engine::Unity => {
            if cfg!(windows) {
                v.push(home.join("AppData/LocalLow").join(company).join(product).join("Player.log"));
            } else if cfg!(target_os = "macos") {
                v.push(home.join("Library/Logs").join(company).join(product).join("Player.log"));
            } else {
                v.push(home.join(".config/unity3d").join(company).join(product).join("Player.log"));
            }
        }
        Engine::Unreal => {
            if let Some(dir) = project_dir {
                v.push(dir.join("Saved/Logs").join(format!("{product}.log")));
            }
        }
        Engine::Source2 => {
            // cs2 needs -condebug on its launch options for this file to exist
            if let Some(dir) = project_dir {
                v.push(dir.join("game/csgo/console.log"));
            }
        }
        Engine::Godot => {
            let base = if cfg!(windows) {
                dirs::data_dir().unwrap_or_default().join("Godot/app_userdata")
            } else if cfg!(target_os = "macos") {
                home.join("Library/Application Support/Godot/app_userdata")
            } else {
                home.join(".local/share/godot/app_userdata")
            };
            v.push(base.join(product).join("logs/godot.log"));
        }
        Engine::Generic => {}
    }
    v
}
