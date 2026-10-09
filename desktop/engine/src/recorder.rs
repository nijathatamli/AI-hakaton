//! Keeps the last few seconds of play and turns them into something small enough to send to a big model.

use anyhow::{anyhow, Result};
use std::collections::VecDeque;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use xcap::image::{imageops, Rgb, RgbImage};

#[derive(Clone)]
pub struct Frame {
    pub t_ms: u64,
    pub img: RgbImage,
}

pub struct Ring {
    frames: VecDeque<Frame>,
    keep_ms: u64,
}

impl Ring {
    pub fn new(keep_ms: u64) -> Self {
        Self { frames: VecDeque::new(), keep_ms }
    }
    pub fn push(&mut self, f: Frame) {
        let cutoff = f.t_ms.saturating_sub(self.keep_ms);
        self.frames.push_back(f);
        while self.frames.front().map(|x| x.t_ms < cutoff).unwrap_or(false) {
            self.frames.pop_front();
        }
    }
    pub fn snapshot(&self) -> Vec<Frame> {
        self.frames.iter().cloned().collect()
    }
    pub fn latest(&self) -> Option<&Frame> {
        self.frames.back()
    }
}

/// pick n frames spread evenly across the clip
pub fn spread(frames: &[Frame], n: usize) -> Vec<&Frame> {
    if frames.len() <= n {
        return frames.iter().collect();
    }
    (0..n).map(|i| &frames[i * (frames.len() - 1) / (n - 1)]).collect()
}

/// one image, 3 columns, read left to right then down. a white bar under each tile shows where in the clip it sits
pub fn contact_sheet(frames: &[&Frame], tile_w: u32) -> RgbImage {
    let cols = 3u32;
    let rows = ((frames.len() as u32).max(1) + cols - 1) / cols;
    let (fw, fh) = frames.first().map(|f| f.img.dimensions()).unwrap_or((tile_w, tile_w * 9 / 16));
    let tile_h = (fh as f32 * tile_w as f32 / fw as f32) as u32;
    let gap = 6u32;
    let bar = 4u32;
    let mut sheet = RgbImage::from_pixel(cols * (tile_w + gap) + gap, rows * (tile_h + bar + gap * 2) + gap, Rgb([12, 12, 14]));
    let (t0, t1) = (frames.first().map(|f| f.t_ms).unwrap_or(0), frames.last().map(|f| f.t_ms).unwrap_or(1));
    for (i, f) in frames.iter().enumerate() {
        let (c, r) = (i as u32 % cols, i as u32 / cols);
        let x = gap + c * (tile_w + gap);
        let y = gap + r * (tile_h + bar + gap * 2);
        let tile = imageops::resize(&f.img, tile_w, tile_h, imageops::FilterType::Triangle);
        imageops::replace(&mut sheet, &tile, x as i64, y as i64);
        let frac = if t1 > t0 { (f.t_ms - t0) as f32 / (t1 - t0) as f32 } else { 1.0 };
        let filled = (frac * tile_w as f32) as u32;
        for bx in 0..tile_w {
            for by in 0..bar {
                let px = if bx <= filled { Rgb([235, 235, 240]) } else { Rgb([60, 60, 66]) };
                sheet.put_pixel(x + bx, y + tile_h + gap / 2 + by, px);
            }
        }
    }
    sheet
}

pub fn ffmpeg_available() -> bool {
    Command::new("ffmpeg").arg("-version").stdout(Stdio::null()).stderr(Stdio::null()).status().map(|s| s.success()).unwrap_or(false)
}

/// encode frames to a small h264 mp4. 480p, 8 fps, high crf: a minute lands around 1-2 MB
pub fn encode_clip(frames: &[Frame], out: &Path) -> Result<u64> {
    if frames.is_empty() {
        return Err(anyhow!("no frames"));
    }
    let tmp = out.with_extension("frames");
    std::fs::create_dir_all(&tmp)?;
    for (i, f) in frames.iter().enumerate() {
        f.img.save(tmp.join(format!("{i:05}.jpg")))?;
    }
    let span = frames.last().unwrap().t_ms.saturating_sub(frames[0].t_ms).max(1);
    let fps = ((frames.len() as f64 * 1000.0) / span as f64).clamp(1.0, 30.0);
    let status = Command::new("ffmpeg")
        .args(["-y", "-loglevel", "error", "-framerate", &format!("{fps:.2}"), "-i"])
        .arg(tmp.join("%05d.jpg"))
        .args(["-vf", "scale=-2:480,fps=8", "-c:v", "libx264", "-preset", "veryfast", "-crf", "32", "-pix_fmt", "yuv420p", "-movflags", "+faststart"])
        .arg(out)
        .status()?;
    let _ = std::fs::remove_dir_all(&tmp);
    if !status.success() {
        return Err(anyhow!("ffmpeg failed"));
    }
    Ok(std::fs::metadata(out)?.len())
}

pub fn save_jpeg(img: &RgbImage, path: &PathBuf, q: u8) -> Result<usize> {
    let bytes = crate::capture::to_jpeg(img, q);
    std::fs::write(path, &bytes)?;
    Ok(bytes.len())
}
