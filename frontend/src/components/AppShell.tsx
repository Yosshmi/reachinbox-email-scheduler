import { CalendarClock, LogOut, PenLine, Send } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { api } from "../lib/api";
import type { User } from "../types/api";
import { Button } from "./Button";

export function AppShell({ user }: { user: User }) {
  const navigate = useNavigate();
  async function handleLogout() {
    await api.post("/auth/logout");
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>R</span> ReachInbox</div>
        <div className="profile-card">
          {user.avatar ? <img src={user.avatar} alt="" /> : <span className="avatar-fallback">{user.name[0]}</span>}
          <div><strong>{user.name}</strong><small>{user.email}</small></div>
        </div>
        <Button className="compose-button" onClick={() => navigate("/compose")}><PenLine size={16} /> Compose</Button>
        <p className="nav-label">Core</p>
        <nav>
          <NavLink to="/dashboard/scheduled"><CalendarClock size={17} /> Scheduled</NavLink>
          <NavLink to="/dashboard/sent"><Send size={17} /> Sent</NavLink>
        </nav>
        <button className="logout-button" onClick={handleLogout}><LogOut size={17} /> Logout</button>
      </aside>
      <main className="main-panel"><Outlet /></main>
    </div>
  );
}
