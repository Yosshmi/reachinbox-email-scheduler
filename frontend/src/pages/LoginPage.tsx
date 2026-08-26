import { Navigate } from "react-router-dom";

import { Button } from "../components/Button";
import { API_URL } from "../lib/api";
import type { User } from "../types/api";

export function LoginPage({ user }: { user: User | null }) {
  if (user) return <Navigate to="/dashboard/scheduled" replace />;
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-mark">R</div>
        <p className="eyebrow">EMAIL SCHEDULER</p>
        <h1>Welcome back</h1>
        <p>Sign in to schedule campaigns and track every delivery.</p>
        <Button onClick={() => { window.location.href = `${API_URL}/auth/google`; }}>
          <span className="google-g">G</span> Continue with Google
        </Button>
        <small>Secure authentication powered by Google OAuth</small>
      </section>
    </main>
  );
}
