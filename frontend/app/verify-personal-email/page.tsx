"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";

export default function VerifyPersonalEmailPage() {
  const [message, setMessage] = useState("Đang xác thực email cá nhân...");
  const token = useSyncExternalStore(() => () => {},
    () => new URLSearchParams(window.location.search).get("token") ?? "", () => "");
  const requested = useRef(false);
  useEffect(() => {
    if (!token) return;
    if (requested.current) return;
    requested.current = true;
    fetch("/api/v1/auth/verify-personal-email", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
    }).then(async response => {
      if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string } | null; throw new Error(body?.message ?? "Link đã hết hạn hoặc không hợp lệ."); }
      setMessage("Email cá nhân đã được xác thực và cập nhật. Bạn có thể quay lại hồ sơ.");
    }).catch(error => setMessage(error instanceof Error ? error.message : "Không thể xác thực email."));
  }, [token]);
  return <main className="auth-page auth-action-page"><section className="ws-profile-dialog auth-action-card"><h1>Xác thực email cá nhân</h1><p role="status">{token ? message : "Link xác thực không hợp lệ."}</p><Link href="/login">Đến trang đăng nhập</Link></section></main>;
}
