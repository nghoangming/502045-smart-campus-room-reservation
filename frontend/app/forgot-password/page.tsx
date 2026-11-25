"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalEmail: email.trim() }),
      });
      if (!response.ok) throw new Error("Chưa thể gửi yêu cầu. Vui lòng thử lại sau.");
      setMessage("Nếu email đã được xác thực và gắn với một tài khoản, link đặt lại mật khẩu sẽ được gửi tới đó.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể gửi yêu cầu."); }
    finally { setBusy(false); }
  };
  return <main className="auth-page auth-action-page"><section className="ws-profile-dialog auth-action-card"><Link href="/login">← Quay lại đăng nhập</Link><h1>Quên mật khẩu</h1><p>Nhập email cá nhân đã xác thực để nhận link đặt lại mật khẩu.</p><form className="ws-form" onSubmit={submit}><label className="ws-field">Email cá nhân<input type="email" autoComplete="email" required maxLength={100} value={email} onChange={event => setEmail(event.target.value)} placeholder="tenban@gmail.com" /></label><button className="ws-button" disabled={busy}>{busy ? "Đang gửi..." : "Gửi link đặt lại"}</button></form>{message && <p role="status">{message}</p>}</section></main>;
}
