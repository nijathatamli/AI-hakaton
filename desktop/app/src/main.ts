import { invoke } from '@tauri-apps/api/core';

type Any = any;
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fmtS = (ms: number) => (ms / 1000).toFixed(1) + 's';
const num = (n: number) => (n ?? 0).toLocaleString();

let page = 'playtest';
let poll: number | undefined;
let snap: Any = null;
let selected: Any = null;
let mode: 'window' | 'launch' = 'window';
let openReport: number | null = null;

const form = {
  launch: '',
  windowHint: '',
  engine: 'generic',
  player: 'explore',
  director: '',
  directorModel: '',
  minutes: 3,
  keys: 'left,right,up,down,space,enter,escape',
  goal: 'explore the level and try to break things',
};

function toast(msg: string) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout((t as Any)._h);
  (t as Any)._h = setTimeout(() => t.classList.remove('show'), 3200);
}

async function call<T = Any>(cmd: string, args?: Any): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    toast(String(e));
    throw e;
  }
}

/* ---------- skin ---------- */
async function skin() {
  const p: Any = await invoke('platform');
  let os = p.os === 'macos' ? 'macos' : p.os === 'windows' ? 'windows' : p.desktop.includes('kde') ? 'kde' : p.os === 'linux' ? 'gnome' : '';
  if (os) document.documentElement.dataset.os = os;
}

/* ---------- navigation ---------- */
const titles: Record<string, string> = { playtest: 'Playtest', reports: 'Reports', connect: 'Connect', account: 'Account' };
function go(p: string) {
  page = p;
  openReport = null;
  document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('active', (b as HTMLElement).dataset.page === p));
  $('#page-title').textContent = titles[p];
  render();
}
document.querySelectorAll('.nav button').forEach((b) => b.addEventListener('click', () => go((b as HTMLElement).dataset.page!)));

function render() {
  const actions = $('#toolbar-actions');
  actions.innerHTML = '';
  if (page === 'playtest') return snap?.running ? renderLive() : renderSetup();
  if (page === 'reports') return renderReports();
  if (page === 'connect') return renderConnect();
  if (page === 'account') return renderAccount();
}

/* ---------- playtest: setup ---------- */
async function renderSetup() {
  const el = $('#page');
  const models: string[] = await invoke('ollama_models').catch(() => []) as string[];
  const last = snap && !snap.running ? `<div class="card section" style="display:flex;align-items:center;gap:12px">
      <div class="grow" style="flex:1"><b>Last playtest finished.</b> <span class="muted">${snap.incidents?.length ?? 0} incidents, ${snap.reports?.length ?? 0} reports${snap.error ? ' · ' + esc(snap.error) : ''}</span></div>
      <button class="btn small" id="see-reports">See reports</button></div>` : '';
  el.innerHTML = `
    ${last}
    <div class="section">
      <h2><span>Game</span>
        <span class="segmented" role="tablist">
          <button class="${mode === 'window' ? 'on' : ''}" data-mode="window">Running window</button>
          <button class="${mode === 'launch' ? 'on' : ''}" data-mode="launch">Launch command</button>
        </span>
      </h2>
      ${mode === 'window'
        ? `<div class="windows" id="windows"><div class="muted">Looking for windows…</div></div>
           <p class="hint">Pick the game. PlayerOne captures only this window and sends keys to it.</p>`
        : `<div class="grid-2">
             <label class="field">Command that starts the game<input type="text" id="f-launch" placeholder="godot --path ./my-game" value="${esc(form.launch)}"></label>
             <label class="field">Window title contains<input type="text" id="f-hint" placeholder="My Game" value="${esc(form.windowHint)}"></label>
           </div>
           <p class="hint">Launching lets PlayerOne read the engine console and catch crashes the moment they happen.</p>`}
    </div>
    <div class="section">
      <h2>Who plays and who judges</h2>
      <div class="grid-3">
        <label class="field">Player, runs on this machine
          <select id="f-player">
            ${models.map((m) => `<option value="ollama:${esc(m)}" ${form.player === 'ollama:' + m ? 'selected' : ''}>${esc(m)} (local, free)</option>`).join('')}
            <option value="explore" ${form.player === 'explore' ? 'selected' : ''}>Explorer bot (no model)</option>
            <option value="random" ${form.player === 'random' ? 'selected' : ''}>Random keys (baseline)</option>
          </select>
        </label>
        <label class="field">Director, reads digests and files bugs
          <select id="f-director">
            <option value="" ${form.director === '' ? 'selected' : ''}>None, standalone</option>
            <option value="claude" ${form.director === 'claude' ? 'selected' : ''}>Claude</option>
            <option value="openai" ${form.director === 'openai' ? 'selected' : ''}>OpenAI / Codex</option>
            <option value="gemini" ${form.director === 'gemini' ? 'selected' : ''}>Gemini (gets video)</option>
            <option value="ollama" ${form.director === 'ollama' ? 'selected' : ''}>Local model</option>
          </select>
        </label>
        <label class="field">Director model (optional)<input type="text" id="f-dmodel" placeholder="provider default" value="${esc(form.directorModel)}"></label>
      </div>
      <p class="hint">Engine console errors and crashes are caught even with no model at all. A director turns incidents into written bug reports and steers the player.</p>
    </div>
    <div class="section">
      <h2>Run</h2>
      <div class="grid-3">
        <label class="field">Engine
          <select id="f-engine">
            ${['generic', 'godot', 'unity', 'unreal', 'source2'].map((x) => `<option value="${x}" ${form.engine === x ? 'selected' : ''}>${({ generic: 'Any', godot: 'Godot', unity: 'Unity', unreal: 'Unreal', source2: 'Source 2 / CS2' } as Any)[x]}</option>`).join('')}
          </select>
        </label>
        <label class="field">Minutes<input type="number" id="f-min" min="0.5" max="120" step="0.5" value="${form.minutes}"></label>
        <label class="field">Keys the player may press<input type="text" id="f-keys" value="${esc(form.keys)}"></label>
      </div>
      <label class="field" style="margin-top:12px">Goal<textarea id="f-goal">${esc(form.goal)}</textarea></label>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn primary" id="start">Start playtest</button></div>`;

  el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { save(); mode = (b as HTMLElement).dataset.mode as Any; renderSetup(); }));
  $('#see-reports')?.addEventListener('click', () => go('reports'));
  $('#start').addEventListener('click', start);
  if (mode === 'window') loadWindows();
}

async function loadWindows() {
  const box = $('#windows');
  if (!box) return;
  const wins: Any[] = await call('list_windows');
  if (!wins.length) {
    box.innerHTML = `<div class="empty" style="grid-column:1/-1"><b>No windows found</b>Start your game, then come back.</div>`;
    return;
  }
  box.innerHTML = wins.map((w) => `<button class="win ${selected?.id === w.id ? 'on' : ''}" data-id="${w.id}">
      <div class="thumb" id="th-${w.id}"></div><div class="t">${esc(w.title)}</div><div class="a">${esc(w.app)} · ${w.width}×${w.height}</div></button>`).join('');
  box.querySelectorAll('.win').forEach((b) => b.addEventListener('click', () => {
    selected = wins.find((w) => String(w.id) === (b as HTMLElement).dataset.id);
    box.querySelectorAll('.win').forEach((x) => x.classList.toggle('on', x === b));
  }));
  for (const w of wins.slice(0, 16)) {
    invoke<string | null>('window_thumb', { id: w.id }).then((b64) => {
      const t = document.getElementById('th-' + w.id);
      if (t && b64) t.style.backgroundImage = `url(data:image/jpeg;base64,${b64})`;
    });
  }
}

function save() {
  const v = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value;
  form.launch = v('f-launch') ?? form.launch;
  form.windowHint = v('f-hint') ?? form.windowHint;
  form.player = v('f-player') ?? form.player;
  form.director = v('f-director') ?? form.director;
  form.directorModel = v('f-dmodel') ?? form.directorModel;
  form.engine = v('f-engine') ?? form.engine;
  form.minutes = Number(v('f-min') ?? form.minutes);
  form.keys = v('f-keys') ?? form.keys;
  form.goal = v('f-goal') ?? form.goal;
}

async function start() {
  save();
  if (mode === 'window' && !selected) return toast('Pick a game window first.');
  if (mode === 'launch' && !form.launch) return toast('Enter the command that starts the game.');
  const director = form.director ? form.director + (form.directorModel ? ':' + form.directorModel : '') : null;
  await call('start', {
    args: {
      window: mode === 'window' ? selected.title : form.windowHint,
      launch: mode === 'launch' ? form.launch : null,
      engine: form.engine,
      minutes: form.minutes,
      goal: form.goal,
      player: form.player,
      director,
      keys: form.keys.split(',').map((s) => s.trim()).filter(Boolean),
    },
  });
  snap = { running: true, started: false, events: [], incidents: [], reports: [], meter: {} };
  startPolling();
  renderLive();
}

/* ---------- playtest: live ---------- */
function startPolling() {
  clearInterval(poll);
  poll = window.setInterval(async () => {
    snap = await invoke('snapshot');
    updateBadge();
    if (page === 'playtest') {
      if (snap && !snap.running) {
        clearInterval(poll);
        toast(`Playtest finished: ${snap.reports.length} reports`);
        renderSetup();
      } else updateLive();
    }
  }, 500);
}

function renderLive() {
  $('#toolbar-actions').innerHTML = `<button class="btn danger" id="stop">Stop</button>`;
  $('#stop').addEventListener('click', () => invoke('stop'));
  $('#page').innerHTML = `
    <div class="live">
      <div class="stage">
        <div class="screen"><img id="frame" alt="Live view of the game"><span class="rec" id="rec">Starting</span><div class="chips" id="chips"></div></div>
        <div class="instruct"><input type="text" id="goal-in" placeholder="Tell the player what to try next, e.g. jump into every wall"><button class="btn" id="goal-btn">Send</button></div>
      </div>
      <div class="side">
        <div class="stats" id="stats"></div>
        <div class="feed" id="feed"></div>
      </div>
    </div>`;
  const send = () => {
    const g = ($('#goal-in') as HTMLInputElement).value.trim();
    if (!g) return;
    invoke('instruct', { goal: g });
    ($('#goal-in') as HTMLInputElement).value = '';
    toast('Player has a new goal');
  };
  $('#goal-btn').addEventListener('click', send);
  $('#goal-in').addEventListener('keydown', (e) => (e as KeyboardEvent).key === 'Enter' && send());
  updateLive();
}

function updateLive() {
  if (!snap || !$('#frame')) return;
  if (snap.frame) ($('#frame') as HTMLImageElement).src = 'data:image/jpeg;base64,' + snap.frame;
  $('#rec').textContent = snap.started ? `${esc(snap.window)} · ${fmtS(snap.t_ms)}` : 'Waiting for the game window';
  $('#chips').innerHTML = (snap.actions || []).slice(0, 4).reverse().map((a: string) => `<span class="chip">${esc(a)}</span>`).join('');
  const m = snap.meter || {};
  const big = (m.director_tokens?.input || 0) + (m.director_tokens?.output || 0);
  const naive = m.naive_director_tokens || 0;
  const saved = naive ? Math.max(0, Math.round((1 - big / naive) * 100)) : 0;
  $('#stats').innerHTML = `
    <div class="stat"><b>${num(m.player_steps)}</b><span>player moves</span></div>
    <div class="stat"><b>${snap.incidents.length}</b><span>incidents</span></div>
    <div class="stat"><b>${num(m.frames_captured)}</b><span>frames recorded</span></div>
    <div class="stat"><b>${snap.reports.length}</b><span>bugs filed</span></div>
    <div class="stat wide"><b>${num(big)} <span class="muted" style="font-size:12px">of ${num(naive)}</span></b><span>big-model tokens used, versus playing the game itself${naive ? ` · ${saved}% saved` : ''}</span></div>`;
  const evs: Any[] = snap.events || [];
  $('#feed').innerHTML = evs.map((e) => `<div class="row ${esc(e.kind)}"><time>${fmtS(e.t_ms)}</time><div><span class="k">${esc(e.kind)}</span>${esc(e.text)}</div></div>`).join('') || '<div class="empty">Events show up here.</div>';
}

function updateBadge() {
  const n = snap?.reports?.length || 0;
  const c = $('#report-count');
  c.hidden = !n;
  c.textContent = String(n);
}

/* ---------- reports ---------- */
async function renderReports() {
  const el = $('#page');
  const reps: Any[] = snap?.reports || [];
  if (!reps.length) {
    el.innerHTML = `<div class="empty"><b>No bug reports yet</b>Run a playtest. Crashes, hangs, engine errors and anything the director confirms land here.</div>`;
    return;
  }
  if (snap?.out_dir) {
    $('#toolbar-actions').innerHTML = `<button class="btn" id="reveal">Show in folder</button>`;
    $('#reveal').addEventListener('click', () => invoke('reveal', { path: snap.out_dir }));
  }
  if (openReport != null) {
    const r = reps.find((x) => x.id === openReport);
    const img = r.sheet ? await invoke<string | null>('read_image', { path: r.sheet }) : null;
    el.innerHTML = `
      <button class="btn small" id="back" style="margin-bottom:14px">All reports</button>
      <div class="report">
        <div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span class="sev ${esc(r.severity)}">${esc(r.severity)}</span><span class="muted" style="font-size:12px">filed by ${esc(r.filed_by)}</span></div>
          <h2 style="font-size:18px;margin-bottom:14px">${esc(r.title)}</h2>
          ${r.steps?.length ? `<div class="section"><h2>Steps to reproduce</h2><ol>${r.steps.map((s: string) => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
          ${r.expected ? `<div class="section"><h2>Expected</h2><p>${esc(r.expected)}</p></div>` : ''}
          ${r.actual ? `<div class="section"><h2>Actual</h2><p>${esc(r.actual)}</p></div>` : ''}
          ${r.console?.length ? `<div class="section"><h2>Engine console</h2><pre class="console">${esc(r.console.join('\n'))}</pre></div>` : ''}
        </div>
        <div>${img ? `<div class="section"><h2>The seconds before it happened</h2><img alt="Frames before the bug" src="data:image/jpeg;base64,${img}"></div>` : ''}
          ${r.clip ? `<p class="hint">Video clip: ${esc(r.clip)}</p>` : ''}</div>
      </div>`;
    $('#back').addEventListener('click', () => { openReport = null; renderReports(); });
    return;
  }
  el.innerHTML = `<div class="list">${reps.map((r) => `
      <button class="item" data-id="${r.id}"><span class="sev ${esc(r.severity)}">${esc(r.severity)}</span>
        <span class="grow"><div class="title">${esc(r.title)}</div><div class="muted" style="font-size:12px">${esc(r.filed_by)}${r.incident ? ' · incident #' + r.incident : ''}</div></span></button>`).join('')}</div>`;
  el.querySelectorAll('.item').forEach((b) => b.addEventListener('click', () => { openReport = Number((b as HTMLElement).dataset.id); renderReports(); }));
}

/* ---------- connect ---------- */
async function renderConnect() {
  const keys: string[] = await invoke('saved_keys');
  const agents = [
    ['claude-code', 'Claude Code', 'Claude directs. Ask it to “playtest my game with playerone”.'],
    ['codex', 'Codex', 'Adds PlayerOne to ~/.codex/config.toml.'],
    ['gemini', 'Gemini CLI', 'Adds PlayerOne to ~/.gemini/settings.json. Gemini can watch real clips.'],
  ];
  $('#page').innerHTML = `
    <div class="section">
      <h2>Use the AI you already have</h2>
      <div class="connectors">${agents.map(([id, name, d]) => `
        <div class="card connector"><div class="name">${name}</div><div class="muted" style="font-size:12px">${d}</div>
          <div class="out" id="out-${id}"></div><div><button class="btn primary small" data-connect="${id}">Connect</button></div></div>`).join('')}</div>
      <p class="hint">Connected agents become the director. Our local model still does the playing, so their tokens only go to judging.</p>
    </div>
    <div class="section">
      <h2>Or bring an API key</h2>
      <div class="card">
        <div class="grid-3">
          <label class="field">Provider<select id="k-prov"><option value="claude">Anthropic (Claude)</option><option value="openai">OpenAI (Codex)</option><option value="gemini">Google (Gemini)</option></select></label>
          <label class="field" style="grid-column:span 2">Key<input type="password" id="k-key" placeholder="Stays on this machine"></label>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
          <span class="muted" style="font-size:12px">Saved: ${keys.length ? keys.map(esc).join(', ') : 'none yet'}</span>
          <button class="btn" id="k-save">Save key</button>
        </div>
      </div>
    </div>`;
  document.querySelectorAll('[data-connect]').forEach((b) => b.addEventListener('click', async () => {
    const id = (b as HTMLElement).dataset.connect!;
    const out = await call<string>('connect', { target: id }).catch(() => '');
    document.getElementById('out-' + id)!.textContent = out;
  }));
  $('#k-save').addEventListener('click', async () => {
    const key = ($('#k-key') as HTMLInputElement).value.trim();
    if (!key) return toast('Paste a key first.');
    await call('set_key', { provider: ($('#k-prov') as HTMLSelectElement).value, key });
    toast('Key saved on this machine');
    renderConnect();
  });
}

/* ---------- account and plans ---------- */
const PLANS = [
  ['free', 'Free', 'Local models only', ['Local player and director', 'Crash, hang and console capture', 'Reports on this machine']],
  ['connect', 'Connect', 'Bring your own AI', ['Everything in Free', 'Claude, Codex and Gemini as director', 'Cloud report history', 'Usage dashboard']],
  ['studio', 'Studio', 'For teams', ['Everything in Connect', 'Seats and shared reports', 'CI playtests on every build', 'Hosted director credits']],
];

async function renderAccount() {
  const a: Any = await invoke('account').catch((e) => ({ mode: 'error', note: String(e) }));
  const plan = a.mode === 'offline' ? 'studio' : a.plan || 'free';
  $('#plan-badge').textContent = a.mode === 'offline' ? 'Developer build' : `${plan[0].toUpperCase()}${plan.slice(1)} plan`;
  $('#page').innerHTML = `
    <div class="section">
      <h2>Account</h2>
      <div class="card">
        ${a.mode === 'signed in'
          ? `<div style="display:flex;align-items:center;justify-content:space-between"><div><b>${esc(a.email)}</b><div class="muted" style="font-size:12px">Signed in</div></div><button class="btn" id="logout">Sign out</button></div>`
          : a.mode === 'offline'
            ? `<b>Developer build</b><p class="muted" style="font-size:12px;margin-top:4px">No account server is configured, so every feature is unlocked. Release builds sign in to the PlayerOne account server.</p>`
            : `<div class="grid-3" style="align-items:end">
                 <label class="field">Email<input type="email" id="a-email" autocomplete="username"></label>
                 <label class="field">Password<input type="password" id="a-pass" autocomplete="current-password"></label>
                 <div><button class="btn primary" id="login">Sign in</button></div>
               </div><p class="hint">No account yet? Create one on the PlayerOne website. Free works without one.</p>`}
      </div>
    </div>
    <div class="section">
      <h2>Plans</h2>
      <div class="plans">${PLANS.map(([id, name, sub, feats]) => `
        <div class="card plan ${plan === id ? 'current' : ''}"><h3>${name}</h3><div class="muted" style="font-size:12px">${sub}</div>
          <ul>${(feats as string[]).map((f) => `<li>${f}</li>`).join('')}</ul></div>`).join('')}</div>
      <p class="hint">Upgrades and billing happen on the PlayerOne website. Hosted director credits are priced from the tokens we measure per playtest hour.</p>
    </div>`;
  $('#logout')?.addEventListener('click', async () => { await call('logout'); renderAccount(); });
  $('#login')?.addEventListener('click', async () => {
    const email = ($('#a-email') as HTMLInputElement).value;
    const password = ($('#a-pass') as HTMLInputElement).value;
    const r: Any = await call('login', { email, password });
    toast(`Signed in on the ${r.plan} plan`);
    renderAccount();
  });
}

/* ---------- boot ---------- */
(async () => {
  await skin().catch(() => {});
  render();
  invoke('account').then((a: Any) => {
    $('#plan-badge').textContent = a.mode === 'offline' ? 'Developer build' : `${(a.plan || 'free').replace(/^./, (c: string) => c.toUpperCase())} plan`;
  }).catch(() => {});
})();
