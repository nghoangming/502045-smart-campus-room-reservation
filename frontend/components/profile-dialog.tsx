"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import useSWR from "swr";
import { campusApi } from "@/lib/campus-api";
import { demoAuth, type DemoAccount } from "@/lib/demo-auth";

function PasswordField({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return <label className="ws-field">{label}<span className="ws-password-input"><input {...props} type={visible ? "text" : "password"} /><button type="button" onClick={() => setVisible(value => !value)} aria-label={`${visible ? "Ẩn" : "Hiện"} ${label.toLowerCase()}`} aria-pressed={visible} title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>;
}

export function ProfileDialog({ account, initialSection, close, updated }: { account: DemoAccount; initialSection: "profile" | "security"; close: () => void; updated: (name: string) => void }) {
  const { data, error, mutate } = useSWR(`profile-${account.id}`, campusApi.myProfile);
  const [section, setSection] = useState<"profile" | "security">(initialSection);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [className, setClassName] = useState("");
  const [entryYear, setEntryYear] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { const timer = setTimeout(() => { setSection(initialSection); setMessage(""); }, 0); return () => clearTimeout(timer); }, [initialSection]);
  useEffect(() => { if (!data) return; const timer = setTimeout(() => { setName(data.name); setBirthDate(data.birthDate ?? ""); setPhone(data.phone ?? ""); setPersonalEmail(data.personalEmail ?? ""); setClassName(data.className ?? ""); setEntryYear(data.entryYear?.toString() ?? ""); }, 0); return () => clearTimeout(timer); }, [data]);
  const saveName = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const saved = await campusApi.updateProfile({ name, birthDate: birthDate || null, phone: phone || null, className: account.role === "STUDENT" ? className || null : null, entryYear: account.role === "ADMIN" || !entryYear ? null : Number(entryYear) }); updated(saved.name); await mutate(saved); setMessage("Đã lưu hồ sơ."); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không thể lưu hồ sơ."); }
    finally { setBusy(false); }
  };
  const changeEmail = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await campusApi.requestPersonalEmailChange(personalEmail, emailChangePassword);
      setEmailChangePassword("");
      setMessage("Đã gửi link xác thực đến email mới. Email trong hồ sơ sẽ đổi sau khi bạn xác nhận.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không thể gửi link xác thực."); }
    finally { setBusy(false); }
  };
  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage("");
    if (newPassword !== confirmPassword) { setMessage("Mật khẩu xác nhận không khớp."); return; }
    setBusy(true);
    try { await campusApi.changePassword(currentPassword, newPassword); demoAuth.signOut(); window.location.assign(account.role === "ADMIN" ? "/admin/login" : "/login"); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không thể đổi mật khẩu."); }
    finally { setBusy(false); }
  };
  return <section className="ws-account-page" aria-label="Tài khoản của tôi">
    <div className="ws-account-heading"><div><span className="ws-section-kicker">THIẾT LẬP TÀI KHOẢN</span><h1>Tài khoản của tôi</h1><p>Quản lý thông tin cá nhân và bảo mật tài khoản.</p></div><button type="button" className="ws-account-back" onClick={close}><span aria-hidden="true">←</span> Quay lại portal</button></div>
    <div className="ws-account-tabs" role="tablist" aria-label="Mục cài đặt"><button type="button" role="tab" aria-selected={section === "profile"} className={section === "profile" ? "active" : ""} onClick={() => { setSection("profile"); setMessage(""); }}>Thông tin cá nhân</button><button type="button" role="tab" aria-selected={section === "security"} className={section === "security" ? "active" : ""} onClick={() => { setSection("security"); setMessage(""); }}>Bảo mật</button></div>
    <div className="ws-account-layout"><aside className="ws-account-sidebar"><div className="ws-account-identity"><strong>{data?.name ?? account.name}</strong><small>{account.role === "ADMIN" ? "Quản trị viên" : account.role === "TEACHER" ? "Giảng viên" : "Sinh viên"}</small></div><div className="ws-account-summary"><div><small>MÃ TÀI KHOẢN</small><strong>{data?.code ?? "—"}</strong></div><div><small>EMAIL</small><strong>{data?.email ?? account.email}</strong></div>{account.role !== "ADMIN" && <><div><small>KHOA</small><strong>{data?.faculty ?? "Chưa cập nhật"}</strong></div><div><small>NGÀY TẠO TÀI KHOẢN</small><strong>{data?.createdAt ? new Date(data.createdAt).toLocaleDateString("vi-VN") : "—"}</strong></div><div><small>KÍCH HOẠT TÀI KHOẢN</small><strong>{data?.verified ? "Đã kích hoạt" : "Chưa kích hoạt"}</strong></div></>}</div></aside>
      <div className="ws-account-panel"><div className="ws-account-panel-head"><span className="ws-account-panel-icon">{section === "profile" ? "01" : "02"}</span><div><h2>{section === "profile" ? "Thông tin hồ sơ" : "Bảo mật tài khoản"}</h2><p>{section === "profile" ? "Thông tin được sử dụng trong các hoạt động của campus." : "Đổi mật khẩu để giữ an toàn cho tài khoản."}</p></div></div>
        {error && <p className="ws-form-error">Không thể tải hồ sơ.</p>}
        {section === "profile" ? <form className="ws-form ws-account-form" onSubmit={saveName}><label className="ws-field">Họ và tên<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label><label className="ws-field">Ngày sinh<input type="date" value={birthDate} onChange={event => setBirthDate(event.target.value)} /></label><label className="ws-field">Số điện thoại<input type="tel" maxLength={20} value={phone} onChange={event => setPhone(event.target.value)} placeholder="Số điện thoại liên hệ" /></label>{account.role === "STUDENT" && <label className="ws-field">Lớp<input maxLength={60} value={className} onChange={event => setClassName(event.target.value)} placeholder="Mã lớp" /></label>}{account.role !== "ADMIN" && <label className="ws-field">Năm vào trường<input type="number" min={1900} max={2100} value={entryYear} onChange={event => setEntryYear(event.target.value)} placeholder="VD: 2026" /></label>}<div className="ws-account-actions"><button className="ws-button" disabled={busy || !data}>{busy ? "Đang lưu..." : "Lưu thay đổi"}</button></div></form> : <form className="ws-form ws-account-form ws-security-form" onSubmit={savePassword}><PasswordField label="Mật khẩu hiện tại" autoComplete="current-password" placeholder="Nhập mật khẩu hiện tại" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /><PasswordField label="Mật khẩu mới" autoComplete="new-password" placeholder="Tạo mật khẩu mới" required minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} /><PasswordField label="Xác nhận mật khẩu mới" autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /><div className="ws-password-rules"><strong>Bảo vệ tài khoản</strong><p>Dùng mật khẩu riêng cho Smart Campus và không chia sẻ với người khác.</p><div className="ws-password-rule-list"><span>Ít nhất 8 ký tự</span><span>Nhập lại đúng mật khẩu mới để xác nhận</span></div><small>Email tài khoản</small><b>{data?.email ?? account.email}</b></div><button className="ws-button" disabled={busy || newPassword.length < 8 || !confirmPassword}>{busy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</button><p className="ws-account-hint">Bạn có thể cần đăng nhập lại sau khi đổi mật khẩu.</p></form>}
        {section === "profile" && <form className="ws-form ws-account-form" onSubmit={changeEmail}><h3>Email cá nhân để khôi phục tài khoản</h3><p>Email đang xác thực: {data?.personalEmail ?? "Chưa có"} · {data?.personalEmailVerified ? "Đã xác thực" : "Chưa xác thực"}</p><label className="ws-field">Email cá nhân mới<input type="email" maxLength={100} required value={personalEmail} onChange={event => setPersonalEmail(event.target.value)} placeholder="Email cá nhân mới" /></label><PasswordField label="Mật khẩu hiện tại" autoComplete="current-password" required value={emailChangePassword} onChange={event => setEmailChangePassword(event.target.value)} /><button className="ws-button" disabled={busy || !data || personalEmail.trim().toLowerCase() === (data?.personalEmail ?? "").toLowerCase()}>Gửi link xác thực</button></form>}
        {message && <p className="ws-form-note" role="status">{message}</p>}
      </div>
    </div>
  </section>;
}



