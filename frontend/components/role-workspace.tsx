"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { ArrowRight, Bell, Building2, CalendarDays, Check, ChevronDown, CircleAlert, ClipboardCheck, DoorOpen, LayoutDashboard, LogOut, Menu, QrCode, Search, ShieldCheck, Trash2, UserRoundX, UsersRound, Wrench, X } from "lucide-react";
import { demoAuth, type DemoAccount, type Role } from "@/lib/demo-auth";
import { campusApi } from "@/lib/campus-api";
import type { WorkspaceContext, WorkspaceData } from "@/lib/workspace-types";
import { roleName } from "@/lib/workspace-types";
import { AdminViews } from "@/components/admin-views";
import { LearningViews } from "@/components/learning-views";
import { ProfileDialog } from "@/components/profile-dialog";
import { NotificationView } from "@/components/notification-view";

const nav = {
  ADMIN: [{ id: "overview", title: "Tổng quan", icon: LayoutDashboard }, { id: "rooms", title: "Phòng & thiết bị", icon: DoorOpen }, { id: "bookings", title: "Yêu cầu đặt phòng", icon: CalendarDays }, { id: "absences", title: "Báo vắng", icon: UserRoundX }, { id: "users", title: "Người dùng", icon: UsersRound }, { id: "incidents", title: "Sự cố", icon: Wrench }],
  TEACHER: [{ id: "overview", title: "Tổng quan", icon: LayoutDashboard }, { id: "schedule", title: "Lịch giảng dạy", icon: CalendarDays }, { id: "bookings", title: "Đặt phòng", icon: DoorOpen }, { id: "absences", title: "Báo vắng", icon: UserRoundX }, { id: "attendance", title: "Điểm danh", icon: ClipboardCheck }, { id: "incidents", title: "Báo cáo sự cố", icon: Wrench }],
  STUDENT: [{ id: "overview", title: "Tổng quan", icon: LayoutDashboard }, { id: "schedule", title: "Lịch của tôi", icon: CalendarDays }, { id: "bookings", title: "Đặt phòng tự học", icon: DoorOpen }, { id: "seats", title: "Tìm chỗ ngồi", icon: Search }, { id: "absences", title: "Báo vắng", icon: UserRoundX }, { id: "checkin", title: "Check-in QR", icon: QrCode }],
};
const headings: Record<Role, string> = {
  ADMIN: "KHÔNG GIAN QUẢN TRỊ",
  TEACHER: "KHÔNG GIAN GIẢNG VIÊN",
  STUDENT: "KHÔNG GIAN SINH VIÊN",
};

export function RoleWorkspace({ role }: { role: Role }) {
  const router = useRouter();
  const { mutate: mutateCache } = useSWRConfig();
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSection, setProfileSection] = useState<"profile" | "security">("profile");
  const [profileSelection, setProfileSelection] = useState(0);
  const [notice, setNotice] = useState("");
  const [pendingAction, setPendingAction] = useState<{ title: string; detail: string; action: () => void } | null>(null);
  const [edits, setEdits] = useState<Partial<WorkspaceData>>({});
  const { data: notifications = [] } = useSWR(account ? `notifications-${account.id}` : null, campusApi.notifications, { refreshInterval: 10000, revalidateOnFocus: true });
  const { data: source, error, isLoading, mutate } = useSWR(account ? `campus-live-${role}-${account.id}` : null, async (): Promise<WorkspaceData> => {
    const [apiRooms, apiReservations, apiSessions, apiIncidents, users, apiResources] = await Promise.all([campusApi.rooms(), campusApi.reservations(), campusApi.sessions(), role === "STUDENT" ? Promise.resolve([]) : campusApi.incidents(), role === "ADMIN" ? campusApi.users() : Promise.resolve([]), role === "STUDENT" ? Promise.resolve([]) : campusApi.resources()]);
    const rooms = apiRooms.map(room => ({ ...room, status: room.status as "ACTIVE" | "MAINTENANCE" }));
    const reservations = apiReservations.map(reservation => ({ ...reservation, roomCode: rooms.find(room => room.id === reservation.roomId)?.code }));
    const sessions = apiSessions.map(session => ({ id: session.id, bookingId: session.bookingId, subject: session.title, className: session.courseCode, roomId: session.roomId, roomCode: rooms.find(room => room.id === session.roomId)?.code ?? "", startTime: session.startTime, endTime: session.endTime, status: "Sắp diễn ra" as const, calendarStatus: session.calendarStatus ?? "SCHEDULED" as const, teacherId: session.teacherId ?? reservations.find(booking => booking.id === session.bookingId)?.userId ?? 0 }));
    const seats: WorkspaceData["seats"] = [];
    const incidents: WorkspaceData["incidents"] = apiIncidents.map(item => ({ id: item.id, roomId: item.roomId, roomCode: item.roomCode, facultyCode: item.facultyCode, category: item.category, description: item.description, reporterName: item.reporterName, status: item.status, createdAt: item.createdAt, reportedBy: item.reportedBy, assignedTo: item.assignedTo, assignedTeam: item.assignedTeam, resourceId: item.resourceId }));
    const equipment: WorkspaceData["equipment"] = apiResources.map(item => ({ id: item.id, roomId: item.roomId, name: item.name, type: item.type, quantity: item.quantity, status: item.status === "AVAILABLE" ? "Tốt" : item.status === "IN_USE" ? "Đang sử dụng" : item.status === "MAINTENANCE" ? "Bảo trì" : "Cần kiểm tra" }));
    return { rooms, reservations, seats, incidents, sessions, users: users.map(user => ({ ...user, status: user.verified ? "ACTIVE" as const : "INACTIVE" as const })), equipment };
  }, { revalidateOnMount: true, revalidateOnFocus: true, refreshInterval: 30000 });
  useEffect(() => { const timer = setTimeout(() => { const current = demoAuth.current(); setAccount(current); setChecked(true); if (!current) router.replace(role === "ADMIN" ? "/admin/login" : "/login"); else if (current.role !== role) router.replace("/forbidden"); }, 0); return () => clearTimeout(timer); }, [role, router]);
  useEffect(() => { const timer = setTimeout(() => setEdits({}), 0); return () => clearTimeout(timer); }, [role, account?.id]);
  useEffect(() => { if (!source) return; const timer = setTimeout(() => setEdits({}), 0); return () => clearTimeout(timer); }, [source]);
  useEffect(() => {
    if (!notificationOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!notificationRef.current?.contains(event.target as Node)) setNotificationOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationOpen(false);
        notificationRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [notificationOpen]);
  useEffect(() => {
    if (!accountMenuOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        accountMenuRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);
  const items = nav[role];
  const data: WorkspaceData | null = source ? { ...source, ...edits } : null;
  const go = (next: string) => { if (next === "notifications") { setNotificationOpen(true); setMenuOpen(false); setAccountMenuOpen(false); return; } setNotificationOpen(false); setAccountMenuOpen(false); setTab(next); setProfileOpen(next === "settings"); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openNotification = (next: string) => { if (next === "absences" && account) void mutateCache(["absence-requests", role, account.id]); go(next); };
  const openAccountSection = (section: "profile" | "security") => { setProfileSection(section); setProfileSelection(value => value + 1); go("settings"); };
  const flash = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(""), 5000); };
  const update: WorkspaceContext["update"] = (key, next) => setEdits(previous => ({ ...previous, [key]: next }));
  const context: WorkspaceContext | null = account && data ? { role, account, data, unreadNotifications: notifications.filter(item => !item.read).length, update, notice: flash, confirm: (title, detail, action) => setPendingAction({ title, detail, action }), navigate: go } : null;
  const signOut = () => { setAccountMenuOpen(false); demoAuth.signOut(); router.replace(role === "ADMIN" ? "/admin/login" : "/login"); };
  if (!checked || !account || account.role !== role) return <main className="ws-loading" role="status">Đang kiểm tra phiên đăng nhập...</main>;
  const displayName = account.name.startsWith("Demo ") ? roleName[role] : account.name;
  return <div className={`ws-root ws-role-${role.toLowerCase()}`}><header className="ws-header"><div className="ws-header-main"><Link href="/" className="ws-brand"><span className="ws-brand-icon"><Building2 size={20} /></span><span>TDTU <strong>Smart Campus</strong><small>KHÔNG GIAN CHO TƯƠNG LAI</small></span></Link><div className="ws-header-right"><div className="ws-notification-anchor" ref={notificationRef}><button type="button" className="ws-header-bell" onClick={() => setNotificationOpen(current => !current)} aria-label={`Thông báo: ${notifications.filter(item => !item.read).length} chưa đọc`} aria-expanded={notificationOpen} aria-controls="ws-notification-popover" title="Thông báo"><Bell size={19} />{notifications.some(item => !item.read) && <span>{notifications.filter(item => !item.read).length}</span>}</button>{notificationOpen && <NotificationView accountId={account.id} onOpen={openNotification} />}</div><div className="ws-account-menu-anchor" ref={accountMenuRef}><span className="ws-user-name"><strong>{displayName}</strong><small>{roleName[role]}</small></span><button type="button" className="ws-account-menu-toggle" onClick={() => setAccountMenuOpen(open => !open)} aria-label="Mở menu tài khoản" aria-expanded={accountMenuOpen} aria-controls="ws-account-menu"><ChevronDown size={18} /></button>{accountMenuOpen && <div className="ws-account-menu" id="ws-account-menu" role="menu"><button type="button" role="menuitem" onClick={() => openAccountSection("profile")}>Hồ sơ</button><button type="button" role="menuitem" onClick={() => openAccountSection("security")}>Bảo mật</button><button type="button" role="menuitem" className="ws-account-menu-signout" onClick={signOut}><LogOut size={16} /> Đăng xuất</button></div>}</div></div><button type="button" className="ws-mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-expanded={menuOpen}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div><nav className={`ws-nav ${menuOpen ? "open" : ""}`} aria-label="Điều hướng theo vai trò">{items.map(item => <button type="button" key={item.id} onClick={() => go(item.id)} className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined}><item.icon size={16} />{item.title}</button>)}</nav></header>
    <main className="ws-main">{profileOpen ? <ProfileDialog key={profileSelection} account={account} initialSection={profileSection} close={() => go("overview")} updated={name => setAccount({ ...account, name })} /> : <><div className="ws-content-head"><div><span className="ws-section-kicker">{headings[role]} / {items.find(item => item.id === tab)?.title.toUpperCase()}</span><h2>{items.find(item => item.id === tab)?.title}</h2></div></div>
    {isLoading && <div className="ws-empty" role="status">Đang tải dữ liệu...</div>}
    {error && !source && <div className="ws-empty" role="alert"><CircleAlert size={28} /><h3>Không thể tải dữ liệu</h3><p>{error instanceof Error ? error.message : "Vui lòng thử lại."}</p><button className="ws-button" onClick={() => mutate()}>Tải lại</button></div>}
    {context && (role === "ADMIN" ? <AdminViews tab={tab} context={context} /> : <LearningViews tab={tab} context={context} />)}
    <footer className="ws-footer"><span>© {new Date().getFullYear()} TDTU Smart Campus</span><Link href="/">Về trang chủ <ArrowRight size={14} /></Link></footer></>}</main>
    {notice && <div className="ws-toast" role="status"><Check size={17} />{notice}<button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo"><X size={15} /></button></div>}
    {pendingAction && <div className="ws-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setPendingAction(null); }}><div role="alertdialog" aria-modal="true" aria-labelledby="ws-confirm-title" aria-describedby="ws-confirm-detail" className="ws-dialog"><span className="ws-dialog-icon">{pendingAction.title.startsWith("Xóa") ? <Trash2 size={23} /> : <ShieldCheck size={23} />}</span><h2 id="ws-confirm-title">{pendingAction.title}</h2><p id="ws-confirm-detail">{pendingAction.detail}</p><div className="ws-dialog-actions"><button className="ws-button secondary" onClick={() => setPendingAction(null)}>Quay lại</button><button className="ws-button" onClick={() => { pendingAction.action(); setPendingAction(null); }}>{pendingAction.title.startsWith("Xóa") ? "Xóa vĩnh viễn" : "Xác nhận"} <ArrowRight size={16} /></button></div></div></div>}
  </div>;
}




