import React, { useState } from "react";
import { signIn, sendPasswordReset } from "./authService";
import { supabaseConfigured } from "./supabaseClient";
import { APP_NAME, MEET_NAME } from "./config/app";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [mode, setMode] = useState("signin");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === "signin") await signIn(email, password);
      else { await sendPasswordReset(email); setMsg({ ok: true, text: "Check your inbox for a reset link." }); }
    } catch (err) {
      setMsg({ ok: false, text: err.message === "Invalid login credentials" ? "Email or password is wrong. Athletes: your password is your WhatsApp number unless you changed it." : err.message });
    } finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="mark"><span className="mark-box">IITH</span><div><div className="mark-t dark">{APP_NAME}</div><div className="muted small">{MEET_NAME} management</div></div></div>
        <h1 className="h" style={{ marginTop: 18 }}>{mode === "signin" ? "Sign in" : "Reset password"}</h1>
        {!supabaseConfigured && <div className="note warn">Supabase isn't configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.</div>}
        <form onSubmit={submit} className="stack" style={{ gap: 12, marginTop: 12 }}>
          <label className="lbl">IITH email<input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          {mode === "signin" && (
            <label className="lbl">Password<input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          )}
          {msg && <div className={"note " + (msg.ok ? "info" : "err")}>{msg.text}</div>}
          <button className="btn primary" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Send reset link"}</button>
          <button type="button" className="linkbtn" onClick={() => { setMode(mode === "signin" ? "reset" : "signin"); setMsg(null); }}>
            {mode === "signin" ? "Forgot password?" : "Back to sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
