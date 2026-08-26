import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { api } from "./lib/api";
import { ComposePage } from "./pages/ComposePage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import type { ApiResponse, User } from "./types/api";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<{ user: User }>>("/auth/me")
      .then(({ data }) => setUser(data.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="app-loading"><span className="spinner" /> Loading ReachInbox…</div>;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage user={user} />} />
      <Route path="/" element={user ? <AppShell user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to="/dashboard/scheduled" replace />} />
        <Route path="dashboard" element={<Navigate to="/dashboard/scheduled" replace />} />
        <Route path="dashboard/scheduled" element={<DashboardPage />} />
        <Route path="dashboard/sent" element={<DashboardPage />} />
      </Route>
      <Route path="/compose" element={user ? <ComposePage user={user} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={user ? "/dashboard/scheduled" : "/login"} replace />} />
    </Routes>
  );
}
