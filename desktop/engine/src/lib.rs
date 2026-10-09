//! PlayerOne engine. A cheap player model drives the game, engine consoles report errors,
//! and a big director model only ever sees compressed digests.

pub mod agent;
pub mod capture;
pub mod cloud;
pub mod connect;
pub mod input;
pub mod mcp;
pub mod probes;
pub mod providers;
pub mod recorder;
pub mod session;

pub fn now_ms(start: std::time::Instant) -> u64 {
    start.elapsed().as_millis() as u64
}
