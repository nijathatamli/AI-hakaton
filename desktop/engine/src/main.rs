use anyhow::Result;
use clap::{Parser, Subcommand};
use playerone::{cloud, connect, mcp, probes::Engine, session};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "playerone", version, about = "AI playtester. A free local model plays, a big model directs, engine consoles tell the truth.")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// list windows you can playtest
    Windows,
    /// run a playtest from the terminal
    Run {
        /// part of the game window title
        #[arg(long)]
        window: Option<String>,
        /// command that starts the game. its stdout and stderr become console probes
        #[arg(long)]
        launch: Option<String>,
        #[arg(long, default_value = "generic")]
        engine: Engine,
        /// extra log files to follow, repeatable
        #[arg(long = "log")]
        logs: Vec<PathBuf>,
        #[arg(long, default_value_t = 3.0)]
        minutes: f32,
        #[arg(long, default_value = "explore the level and try to break things")]
        goal: String,
        /// ollama:<model>, explore, or random
        #[arg(long, default_value = "explore")]
        player: String,
        /// claude:<model>, openai:<model>, gemini:<model> or ollama:<model>. leave out for standalone mode
        #[arg(long)]
        director: Option<String>,
        /// keys the player may press, comma separated
        #[arg(long, default_value = "left,right,up,down,space,enter,escape")]
        keys: String,
        #[arg(long, default_value = "runs/latest")]
        out: PathBuf,
    },
    /// speak MCP over stdio, for Claude Code, Codex and Gemini CLI
    Mcp,
    /// register PlayerOne with claude-code, codex or gemini
    Connect { target: String },
    /// sign in to your PlayerOne account
    Login {
        #[arg(long)]
        email: String,
        #[arg(long)]
        password: String,
    },
    Logout,
    /// show account and plan
    Account,
    /// save a provider key on this machine: playerone key claude sk-ant-...
    Key { provider: String, key: String },
}

fn main() -> Result<()> {
    match Cli::parse().cmd {
        Cmd::Windows => {
            for w in playerone::capture::list_windows()? {
                println!("{:>6}  {:>4}x{:<4}  {}  ({})", w.pid, w.width, w.height, w.title, w.app);
            }
        }
        Cmd::Run { window, launch, engine, logs, minutes, goal, player, director, keys, out } => {
            let plan = cloud::check_allowed(&player, director.as_deref())?;
            eprintln!("playerone: plan {plan:?}, player {player}, director {}", director.as_deref().unwrap_or("none"));
            let cfg = session::SessionConfig {
                window,
                launch,
                engine,
                logs,
                minutes,
                goal,
                player,
                director,
                out_dir: out,
                keys: keys.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect(),
                quiet: false,
            };
            let out_dir = cfg.out_dir.clone();
            let s = session::new_session(&cfg);
            session::run(s.clone(), cfg)?;
            let summary = serde_json::to_value(&*s.state.lock().unwrap())?;
            let m = &summary["meter"];
            eprintln!(
                "playerone: {} frames, {} player steps, director {} calls / {} tokens in, naive estimate {} tokens",
                m["frames_captured"], m["player_steps"], m["director_calls"], m["director_tokens"]["input"], m["naive_director_tokens"]
            );
            match cloud::push_session(&summary) {
                Ok(true) => eprintln!("playerone: usage and reports synced to your account"),
                Ok(false) => {}
                Err(e) => eprintln!("playerone: sync failed: {e}"),
            }
            eprintln!("playerone: summary in {}", out_dir.join("session.json").display());
        }
        Cmd::Mcp => mcp::serve()?,
        Cmd::Connect { target } => println!("{}", connect::connect(&target)?),
        Cmd::Login { email, password } => {
            let a = cloud::login(&email, &password)?;
            println!("signed in as {} on the {} plan", a.email, a.plan);
        }
        Cmd::Logout => {
            cloud::logout()?;
            println!("signed out");
        }
        Cmd::Account => println!("{}", serde_json::to_string_pretty(&cloud::status()?)?),
        Cmd::Key { provider, key } => {
            cloud::set_key(&provider, &key)?;
            println!("saved {provider} key on this machine");
        }
    }
    Ok(())
}
