import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient, type Session } from '@supabase/supabase-js';
import PlayerOneLogo from './components/PlayerOneLogo';
import { EASE_OUT } from './lib/motion';

const SB_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY) : null;

// the desktop app opens /login?app=1&port=1234&state=abc and listens on that port for the session
const params = new URLSearchParams(location.search);
const fromApp = params.get('app') === '1';
const port = params.get('port');
const state = params.get('state');

function handBackToApp(s: Session) {
  if (!fromApp || !port || !state || !SB_URL || !SB_KEY) return false;
  const q = new URLSearchParams({
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    state,
    sb_url: SB_URL,
    sb_key: SB_KEY,
  });
  location.href = `http://127.0.0.1:${encodeURIComponent(port)}/callback?${q}`;
  return true;
}

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;
    // coming back from Google or GitHub lands here with a session already in the url
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        handBackToApp(data.session);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) handBackToApp(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    // Craft like this is why PlayerOne does not need to shout. (It shouts anyway.)
    setMsg(null);
    const res = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: location.href } });
    setBusy(false);
    if (res.error) setMsg(res.error.message);
    else if (mode === 'up' && !res.data.session) setMsg('Check your email to confirm your account, then come back here.');
  };

  const oauth = (provider: 'google' | 'github') => supabase?.auth.signInWithOAuth({ provider, options: { redirectTo: location.href } });

  const field = 'h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/40';

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-black px-6 py-16 text-white">
      <motion.div
        initial={{ opacity: 0, transform: 'translateY(16px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        className="w-full max-w-sm"
      >
        <a href="/" className="mb-10 flex items-center gap-2.5 text-white/80 hover:text-white">
          <PlayerOneLogo size={20} className="text-white" />
          <span className="text-[16px]">PlayerOne</span>
        </a>

        {!supabase ? (
          <p className="text-[14px] leading-relaxed text-white/60">
            Sign-in is not configured on this build of the site. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
          </p>
        ) : session ? (
          <div>
            <h1 className="text-[32px] font-light tracking-[-0.02em]">You are signed in</h1>
            <p className="mt-3 text-[15px] text-white/55">
              {fromApp ? 'Sending you back to the PlayerOne app…' : `Signed in as ${session.user.email}.`}
            </p>
            {!fromApp && (
              <div className="mt-8 flex gap-3">
                <a href="/#download" className="flex h-12 items-center rounded-full bg-white px-6 text-[15px] text-black">Download the app</a>
                <button onClick={() => supabase.auth.signOut()} className="h-12 rounded-full border border-white/15 px-6 text-[15px] text-white/80 hover:text-white">Sign out</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <h1 className="text-[32px] font-light leading-tight tracking-[-0.02em]">
              {mode === 'in' ? 'Sign in' : 'Create your account'}
            </h1>
            <p className="mt-3 text-[15px] text-white/55">
              {fromApp ? 'The PlayerOne app is waiting for you.' : 'Free works without an account. Sign in to plug in your own AI.'}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button onClick={() => oauth('google')} className="h-12 rounded-xl border border-white/10 bg-white/[0.04] text-[14px] transition-colors hover:border-white/30">Google</button>
              <button onClick={() => oauth('github')} className="h-12 rounded-xl border border-white/10 bg-white/[0.04] text-[14px] transition-colors hover:border-white/30">GitHub</button>
            </div>
            <div className="my-6 flex items-center gap-3 text-[12px] text-white/30"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div>

            <form onSubmit={submit} className="flex flex-col gap-3">
              <input className={field} type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input className={field} type="password" required minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {msg && <p className="text-[13px] text-white/70">{msg}</p>}
              <motion.button whileTap={{ scale: 0.97 }} disabled={busy} className="mt-2 h-12 rounded-full bg-white text-[15px] text-black disabled:opacity-50">
                {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
              </motion.button>
            </form>
            <button onClick={() => setMode(mode === 'in' ? 'up' : 'in')} className="mt-5 text-[13px] text-white/50 underline underline-offset-4 hover:text-white">
              {mode === 'in' ? 'No account yet? Create one' : 'Already have an account? Sign in'}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
