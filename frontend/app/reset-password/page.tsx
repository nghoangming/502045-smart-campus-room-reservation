"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const token = useSyncExternalStore(() => () => {},
    () => new URLSearchParams(window.location.search).get("token") ?? "", () => "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage("");
    if (password !== confirm) { setMessage("Mật khẩu xác nhận không khớp."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/v1/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }),
      });
      if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string } | null; throw new Error(body?.message ?? "Link đã hết hạn hoặc không hợp lệ."); }
      setDone(true); setPassword(""); setConfirm(""); setMessage("Đã đổi mật khẩu. Hãy đăng nhập lại.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể đặt lại mật khẩu."); }
    finally { setBusy(false); }
  };
  return <main className="auth-page auth-action-page"><section className="ws-profile-dialog auth-action-card"><h1>Đặt lại mật khẩu</h1>{!token ? <p role="alert">Link không hợp lệ.</p> : done ? <Link className="ws-button" href="/login">Đăng nhập lại</Link> : <form className="ws-form" onSubmit={submit}><label className="ws-field">Mật khẩu mới<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label><label className="ws-field">Xác nhận mật khẩu<input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={event => setConfirm(event.target.value)} /></label><button className="ws-button" disabled={busy}>{busy ? "Đang cập nhật..." : "Đổi mật khẩu"}</button></form>}{message && <p role="status">{message}</p>}</section></main>;
}
