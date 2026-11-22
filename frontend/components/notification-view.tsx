"use client";

import { useState } from "react";
import useSWR from "swr";
import { ArrowRight, Check, RefreshCw } from "lucide-react";
import { campusApi } from "@/lib/campus-api";
import { viDate, viTime } from "@/lib/workspace-types";

export function NotificationView({ accountId, onOpen }: { accountId: number; onOpen: (tab: string) => void }) {
  const { data = [], error, isLoading, mutate } = useSWR(`notifications-${accountId}`, campusApi.notifications, { refreshInterval: 10000, revalidateOnFocus: true });
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const unreadCount = data.filter(item => !item.read).length;

  const markRead = async (id: number): Promise<boolean> => {
    setBusyId(id);
    setActionError("");
    try {
      await campusApi.markNotificationRead(id);
      await mutate();
      return true;
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể đánh dấu đã đọc.");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const openNotification = async (id: number, read: boolean, tab: string) => {
    if (!read && !await markRead(id)) return;
    onOpen(tab);
  };

  const markAllRead = async () => {
    setBusyId(-1);
    setActionError("");
    try {
      await campusApi.markAllNotificationsRead();
      await mutate();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể đánh dấu đã đọc.");
    } finally {
      setBusyId(null);
    }
  };

  return <div id="ws-notification-popover" className="ws-notification-popover" role="region" aria-label="Thông báo của tôi">
    <div className="ws-notification-popover-head">
      <div><strong>Thông báo</strong><span>{unreadCount} chưa đọc · {data.length} thông báo</span></div>
      <button type="button" className="ws-notification-refresh" onClick={() => void mutate()} disabled={isLoading || busyId !== null} aria-label="Tải lại thông báo" title="Tải lại"><RefreshCw size={17} /></button>
    </div>
    {(error || actionError) && <p className="ws-notification-error" role="alert">{actionError || "Không tải được thông báo. Hãy thử tải lại."}</p>}
    {isLoading && <p className="ws-notification-empty" role="status">Đang tải thông báo...</p>}
    {!isLoading && !error && !data.length && <p className="ws-notification-empty">Bạn chưa có thông báo.</p>}
    {!isLoading && !error && !!data.length && <div className="ws-notification-scroll" role="list">
      {data.map(item => <article key={item.id} role="listitem" className={`ws-notification-row ${item.read ? "read" : "unread"}`}>
        <span className="ws-notification-dot" aria-hidden="true" />
        <div className="ws-notification-copy"><strong>{item.title}</strong><p>{item.message}</p><small>{viDate(item.createdAt)} · {viTime(item.createdAt)}</small>{item.targetTab === "absences" && <button className="ws-notification-open" type="button" disabled={busyId !== null} onClick={() => void openNotification(item.id, item.read, "absences")}>Xem báo vắng <ArrowRight size={14} /></button>}</div>
        {!item.read && <button className="ws-notification-mark" type="button" disabled={busyId !== null} onClick={() => void markRead(item.id)} aria-label={`Đánh dấu đã đọc: ${item.title}`} title="Đánh dấu đã đọc"><Check size={15} /></button>}
      </article>)}
    </div>}
    {!!unreadCount && <div className="ws-notification-popover-foot"><button type="button" onClick={() => void markAllRead()} disabled={isLoading || !!error || busyId !== null}>{busyId === -1 ? "Đang cập nhật..." : "Đánh dấu tất cả đã đọc"}</button></div>}
  </div>;
}
