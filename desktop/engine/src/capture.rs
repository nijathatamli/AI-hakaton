use anyhow::{anyhow, Result};
use serde::Serialize;
use xcap::image::{imageops::FilterType, DynamicImage, RgbImage};
use xcap::Window;

#[derive(Debug, Clone, Serialize)]
pub struct WindowInfo {
    pub id: u32,
    pub pid: u32,
    pub title: String,
    pub app: String,
    pub width: u32,
    pub height: u32,
}

/// windows worth playtesting: visible, titled, not tiny
pub fn list_windows() -> Result<Vec<WindowInfo>> {
    let mut out = Vec::new();
    for w in Window::all()? {
        let title = w.title().unwrap_or_default();
        let (width, height) = (w.width().unwrap_or(0), w.height().unwrap_or(0));
        if title.trim().is_empty() || width < 200 || height < 150 || w.is_minimized().unwrap_or(false) {
            continue;
        }
        out.push(WindowInfo {
            id: w.id().unwrap_or(0),
            pid: w.pid().unwrap_or(0),
            title,
            app: w.app_name().unwrap_or_default(),
            width,
            height,
        });
    }
    Ok(out)
}

/// match on title or app name, case insensitive. prefers an exact pid match when given
pub fn find_window(query: &str, pid: Option<u32>) -> Result<Option<Window>> {
    let q = query.to_lowercase();
    let mut best = None;
    for w in Window::all()? {
        let title = w.title().unwrap_or_default().to_lowercase();
        let app = w.app_name().unwrap_or_default().to_lowercase();
        if w.width().unwrap_or(0) < 200 {
            continue;
        }
        if let Some(p) = pid {
            if w.pid().ok() == Some(p) && !title.is_empty() {
                return Ok(Some(w));
            }
        }
        if !q.is_empty() && (title.contains(&q) || app.contains(&q)) && best.is_none() {
            best = Some(w);
        }
    }
    Ok(best)
}

pub fn find_by_id(id: u32) -> Option<Window> {
    Window::all().ok()?.into_iter().find(|w| w.id().ok() == Some(id))
}

/// capture and shrink to `width` wide. every frame we keep or send is this size
pub fn grab(win: &Window, width: u32) -> Result<RgbImage> {
    let img = win.capture_image().map_err(|e| anyhow!("capture failed: {e}"))?;
    let dynimg = DynamicImage::ImageRgba8(img);
    let h = (dynimg.height() as f32 * width as f32 / dynimg.width().max(1) as f32).round() as u32;
    Ok(dynimg.resize_exact(width, h.max(1), FilterType::Triangle).to_rgb8())
}

/// 0.0 = identical, 1.0 = completely different. samples every 4th pixel, plenty for change detection
pub fn diff(a: &RgbImage, b: &RgbImage) -> f32 {
    if a.dimensions() != b.dimensions() {
        return 1.0;
    }
    let (pa, pb) = (a.as_raw(), b.as_raw());
    let mut sum: u64 = 0;
    let mut n: u64 = 0;
    let mut i = 0;
    while i + 2 < pa.len() {
        sum += (pa[i] as i32 - pb[i] as i32).unsigned_abs() as u64
            + (pa[i + 1] as i32 - pb[i + 1] as i32).unsigned_abs() as u64
            + (pa[i + 2] as i32 - pb[i + 2] as i32).unsigned_abs() as u64;
        n += 3;
        i += 12;
    }
    if n == 0 {
        0.0
    } else {
        sum as f32 / (n as f32 * 255.0)
    }
}

pub fn to_jpeg(img: &RgbImage, quality: u8) -> Vec<u8> {
    let mut buf = Vec::new();
    let mut enc = xcap::image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, quality);
    let _ = enc.encode_image(img);
    buf
}

/// bring the game to the front so our key presses land in it
pub fn focus(win: &Window) {
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::UI::WindowsAndMessaging::{SetForegroundWindow, ShowWindow, SW_RESTORE};
        if let Ok(id) = win.id() {
            let hwnd = id as usize as windows_sys::Win32::Foundation::HWND;
            if win.is_minimized().unwrap_or(false) {
                ShowWindow(hwnd, SW_RESTORE);
            }
            SetForegroundWindow(hwnd);
        }
    }
    #[cfg(target_os = "macos")]
    {
        if let Ok(app) = win.app_name() {
            let _ = std::process::Command::new("osascript")
                .args(["-e", &format!("tell application \"{app}\" to activate")])
                .status();
        }
    }
    #[cfg(target_os = "linux")]
    {
        if let Ok(id) = win.id() {
            let _ = std::process::Command::new("xdotool")
                .args(["windowactivate", &id.to_string()])
                .status();
        }
    }
}

#[allow(dead_code)]
/// true when the OS itself thinks the window stopped pumping messages. unreliable for games, kept for reference (a real hang, not a soft-lock)
pub fn is_hung(win: &Window) -> bool {
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::UI::WindowsAndMessaging::IsHungAppWindow;
        if let Ok(id) = win.id() {
            return IsHungAppWindow(id as usize as windows_sys::Win32::Foundation::HWND) != 0;
        }
    }
    let _ = win;
    false
}
