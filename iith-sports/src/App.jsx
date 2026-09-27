import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getMyProfile, signOut } from "./authService";
import Auth from "./Auth";
import { AppProvider } from "./state/AppProvider";
import Shell from "./components/Shell";

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function resolve(session) {
      if (!session || !session.user) {
        if (mounted) { setUser(null); setProfile(null); setAuthLoading(false); }
        return;
      }
      if (mounted) setUser(session.user);
      try {
        const p = await getMyProfile(session.user.id);
        if (mounted) { setProfile(p); setProfileError(p ? "" : "No profile row exists for this login."); }
      } catch (e) {
        if (mounted) { setProfile(null); setProfileError(e.message); }
      } finally { if (mounted) setAuthLoading(false); }
    }
    supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return; // no need to reload the profile
      resolve(session);
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);

  if (authLoading) return <div className="splash"><div className="spinner" />Checking your login…</div>;
  if (!user) return <Auth />;
  if (!profile) {
    return (
      <div className="splash">
        <h2 className="h">Your account isn't set up yet</h2>
        <p className="muted" style={{ maxWidth: 440, textAlign: "center" }}>You signed in, but there's no profile for this login. Ask the sports council to create your account. {profileError && <span className="small">({profileError})</span>}</p>
        <button className="btn" onClick={signOut}>Sign out</button>
      </div>
    );
  }
  return (
    <AppProvider key={user.id} user={user} profile={profile}>
      <Shell />
    </AppProvider>
  );
}
