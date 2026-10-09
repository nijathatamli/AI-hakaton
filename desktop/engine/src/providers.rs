//! One small client per AI provider. Spec format is "provider:model", e.g. "ollama:qwen2.5vl:3b" or "claude:claude-sonnet-5-5".

use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde::Serialize;
use serde_json::{json, Value};
use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Ollama,
    Claude,
    OpenAI,
    Gemini,
}

#[derive(Debug, Default, Clone, Copy, Serialize)]
pub struct Usage {
    pub input: u64,
    pub output: u64,
}

#[derive(Clone)]
pub struct Provider {
    pub kind: Kind,
    pub model: String,
    key: Option<String>,
    base: String,
    http: reqwest::blocking::Client,
}

impl Provider {
    pub fn from_spec(spec: &str) -> Result<Self> {
        let (name, model) = spec.split_once(':').unwrap_or((spec, ""));
        let (kind, default_model, env_key, base) = match name.to_lowercase().as_str() {
            "ollama" | "local" => (Kind::Ollama, "qwen2.5vl:3b", None, std::env::var("OLLAMA_HOST").unwrap_or_else(|_| "http://127.0.0.1:11434".into())),
            "claude" | "anthropic" => (Kind::Claude, "claude-sonnet-5-5", Some("ANTHROPIC_API_KEY"), "https://api.anthropic.com".into()),
            // codex users bring an openai key
            "openai" | "codex" => (Kind::OpenAI, "gpt-5-mini", Some("OPENAI_API_KEY"), "https://api.openai.com".into()),
            "gemini" | "google" => (Kind::Gemini, "gemini-2.5-flash", Some("GEMINI_API_KEY"), "https://generativelanguage.googleapis.com".into()),
            other => return Err(anyhow!("unknown provider {other}, use ollama, claude, openai or gemini")),
        };
        let key = match env_key {
            Some(k) => Some(std::env::var(k).or_else(|_| crate::cloud::stored_key(name)).with_context(|| format!("{k} is not set"))?),
            None => None,
        };
        Ok(Self {
            kind,
            model: if model.is_empty() { default_model.into() } else { model.into() },
            key,
            base,
            http: reqwest::blocking::Client::builder().timeout(Duration::from_secs(120)).build()?,
        })
    }

    pub fn label(&self) -> String {
        format!("{:?}:{}", self.kind, self.model).to_lowercase()
    }
    pub fn is_local(&self) -> bool {
        self.kind == Kind::Ollama
    }
    /// only gemini takes real video. everyone else gets contact sheets
    pub fn takes_video(&self) -> bool {
        self.kind == Kind::Gemini
    }

    /// images are jpeg bytes. video is mp4 bytes and only used by gemini
    pub fn ask(&self, system: &str, text: &str, images: &[Vec<u8>], video: Option<&[u8]>) -> Result<(String, Usage)> {
        match self.kind {
            Kind::Ollama => self.ollama(system, text, images),
            Kind::Claude => self.claude(system, text, images),
            Kind::OpenAI => self.openai(system, text, images),
            Kind::Gemini => self.gemini(system, text, images, video),
        }
    }

    fn post(&self, url: &str, body: &Value, headers: &[(&str, &str)]) -> Result<Value> {
        let mut req = self.http.post(url).json(body);
        for (k, v) in headers {
            req = req.header(*k, *v);
        }
        let res = req.send().with_context(|| format!("request to {} failed", self.label()))?;
        let status = res.status();
        let v: Value = res.json().unwrap_or(Value::Null);
        if !status.is_success() {
            return Err(anyhow!("{} returned {status}: {}", self.label(), v));
        }
        Ok(v)
    }

    fn ollama(&self, system: &str, text: &str, images: &[Vec<u8>]) -> Result<(String, Usage)> {
        let imgs: Vec<String> = images.iter().map(|b| B64.encode(b)).collect();
        let body = json!({
            "model": self.model, "stream": false, "format": "json",
            "options": { "temperature": 0.4 },
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": text, "images": imgs }
            ]
        });
        let v = self.post(&format!("{}/api/chat", self.base), &body, &[])?;
        let out = v["message"]["content"].as_str().unwrap_or_default().to_string();
        Ok((out, Usage { input: v["prompt_eval_count"].as_u64().unwrap_or(0), output: v["eval_count"].as_u64().unwrap_or(0) }))
    }

    fn claude(&self, system: &str, text: &str, images: &[Vec<u8>]) -> Result<(String, Usage)> {
        let mut content: Vec<Value> = images
            .iter()
            .map(|b| json!({ "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": B64.encode(b) } }))
            .collect();
        content.push(json!({ "type": "text", "text": text }));
        let body = json!({ "model": self.model, "max_tokens": 1500, "system": system, "messages": [{ "role": "user", "content": content }] });
        let key = self.key.as_deref().unwrap_or_default();
        let v = self.post(&format!("{}/v1/messages", self.base), &body, &[("x-api-key", key), ("anthropic-version", "2023-06-01")])?;
        let out = v["content"].as_array().and_then(|a| a.iter().find_map(|c| c["text"].as_str())).unwrap_or_default().to_string();
        Ok((out, Usage { input: v["usage"]["input_tokens"].as_u64().unwrap_or(0), output: v["usage"]["output_tokens"].as_u64().unwrap_or(0) }))
    }

    fn openai(&self, system: &str, text: &str, images: &[Vec<u8>]) -> Result<(String, Usage)> {
        let mut content = vec![json!({ "type": "text", "text": text })];
        for b in images {
            content.push(json!({ "type": "image_url", "image_url": { "url": format!("data:image/jpeg;base64,{}", B64.encode(b)) } }));
        }
        let body = json!({
            "model": self.model, "max_completion_tokens": 1500,
            "response_format": { "type": "json_object" },
            "messages": [{ "role": "system", "content": system }, { "role": "user", "content": content }]
        });
        let auth = format!("Bearer {}", self.key.as_deref().unwrap_or_default());
        let v = self.post(&format!("{}/v1/chat/completions", self.base), &body, &[("authorization", &auth)])?;
        let out = v["choices"][0]["message"]["content"].as_str().unwrap_or_default().to_string();
        Ok((out, Usage { input: v["usage"]["prompt_tokens"].as_u64().unwrap_or(0), output: v["usage"]["completion_tokens"].as_u64().unwrap_or(0) }))
    }

    fn gemini(&self, system: &str, text: &str, images: &[Vec<u8>], video: Option<&[u8]>) -> Result<(String, Usage)> {
        let mut parts = vec![json!({ "text": text })];
        for b in images {
            parts.push(json!({ "inline_data": { "mime_type": "image/jpeg", "data": B64.encode(b) } }));
        }
        if let Some(v) = video {
            parts.push(json!({ "inline_data": { "mime_type": "video/mp4", "data": B64.encode(v) } }));
        }
        let body = json!({
            "system_instruction": { "parts": [{ "text": system }] },
            "contents": [{ "role": "user", "parts": parts }],
            "generationConfig": { "responseMimeType": "application/json" }
        });
        let url = format!("{}/v1beta/models/{}:generateContent", self.base, self.model);
        let key = self.key.as_deref().unwrap_or_default();
        let v = self.post(&url, &body, &[("x-goog-api-key", key)])?;
        let out = v["candidates"][0]["content"]["parts"][0]["text"].as_str().unwrap_or_default().to_string();
        let u = &v["usageMetadata"];
        Ok((out, Usage { input: u["promptTokenCount"].as_u64().unwrap_or(0), output: u["candidatesTokenCount"].as_u64().unwrap_or(0) }))
    }
}

/// models wrap json in prose or code fences. take the outermost object
pub fn extract_json(s: &str) -> Option<Value> {
    if let Ok(v) = serde_json::from_str::<Value>(s.trim()) {
        return Some(v);
    }
    let start = s.find('{')?;
    let end = s.rfind('}')?;
    serde_json::from_str(&s[start..=end]).ok()
}

/// rough token cost of one screenshot if a big model looked at it at full size (anthropic's w*h/750 rule, long edge capped at 1568)
pub fn screenshot_tokens(w: u32, h: u32) -> u64 {
    let scale = (1568.0 / w.max(h) as f64).min(1.0);
    (((w as f64 * scale) * (h as f64 * scale)) / 750.0) as u64
}
