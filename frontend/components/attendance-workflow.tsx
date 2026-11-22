"use client";

import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { campusApi, type ApiAttendance } from "@/lib/campus-api";
import type { WorkspaceContext } from "@/lib/workspace-types";
import { viDate, viTime } from "@/lib/workspace-types";

const statusName: Record<ApiAttendance["status"], string> = {
  PRESENT: "Có mặt", LATE: "Đi trễ", ABSENT: "Vắng mặt", EXCUSED: "Vắng có phép",
  PENDING: "Chưa điểm danh", NOT_CHECKED_IN: "Chưa điểm danh",
};
type CorrectableStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

export function TeacherAttendanceActions({ context: c, sessionId, canFinalize, attendance, refresh }: {
  context: WorkspaceContext; sessionId: number; canFinalize: boolean;
  attendance: ApiAttendance[]; refresh: () => Promise<unknown>;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [status, setStatus] = useState<CorrectableStatus>("PRESENT");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = attendance.filter(item => item.status === "NOT_CHECKED_IN" || item.status === "PENDING").length;

  const finalize = () => c.confirm("Chốt điểm danh buổi học?",
    `Hệ thống ghi vắng mặt cho ${pending} sinh viên đã đặt ghế nhưng chưa điểm danh. Chỉ thực hiện sau khi hết giờ check-in.`, async () => {
      setBusy(true); setError("");
      try {
        const result = await campusApi.finalizeAttendance(sessionId);
        await refresh();
        c.notice(`Đã chốt điểm danh: ${result.markedAbsent} sinh viên được ghi vắng mặt.`);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể chốt điểm danh."); }
      finally { setBusy(false); }
    });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editing === null || !reason.trim()) { setError("Vui lòng nhập lý do điều chỉnh."); return; }
    setBusy(true); setError("");
    try {
      await campusApi.correctAttendance(editing, status, reason.trim());
      await refresh();
      setEditing(null); setReason("");
      c.notice("Đã cập nhật kết quả điểm danh.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể sửa điểm danh."); }
    finally { setBusy(false); }
  };

  return <section className="ws-panel ws-attendance-workflow">
    <div className="ws-panel-header"><div><h3>Quản lý kết quả điểm danh</h3><p>Chốt vắng mặt sau giờ check-in hoặc điều chỉnh kết quả kèm lý do.</p></div><button className="ws-button secondary" type="button" disabled={busy} onClick={() => void refresh()}><RefreshCw size={15} /> Tải lại</button></div>
    <div className="ws-attendance-workflow-body">
      <div className="ws-attendance-finalize"><div><ClipboardCheck size={20} /><span><strong>{pending} sinh viên chưa điểm danh</strong><small>{canFinalize ? "Đã hết giờ check-in, có thể chốt buổi học." : "Có thể chốt sau khi cửa sổ check-in đóng."}</small></span></div><button className="ws-button" type="button" disabled={!canFinalize || busy} onClick={finalize}>{busy ? "Đang xử lý..." : "Chốt điểm danh"}</button></div>
      {error && <p className="ws-form-error" role="alert">{error}</p>}
      {attendance.length ? <div className="ws-table-wrap"><table className="ws-table"><thead><tr><th>GHẾ</th><th>SINH VIÊN</th><th>KẾT QUẢ</th><th>THAO TÁC</th></tr></thead><tbody>{attendance.map(item => <tr key={item.seatId}><td>#{item.seatNumber}</td><td><strong>{item.studentName ?? `Sinh viên #${item.userId}`}</strong></td><td><span className="ws-attendance-status">{statusName[item.status]}</span></td><td>{item.id !== null ? <button className="ws-row-action" type="button" disabled={busy} onClick={() => { setEditing(item.id); setStatus(item.status === "LATE" || item.status === "ABSENT" || item.status === "EXCUSED" ? item.status : "PRESENT"); setReason(""); setError(""); }}>Điều chỉnh</button> : <small>Chốt buổi học để ghi vắng</small>}</td></tr>)}</tbody></table></div> : <p className="ws-attendance-workflow-empty">Chưa có sinh viên đặt ghế cho buổi học này.</p>}
      {editing !== null && <form className="ws-attendance-correction" onSubmit={submit}><div><strong>Điều chỉnh điểm danh #{editing}</strong><button type="button" className="ws-row-action" onClick={() => { setEditing(null); setError(""); }}>Đóng</button></div><label className="ws-field">Kết quả<select value={status} onChange={event => setStatus(event.target.value as CorrectableStatus)}><option value="PRESENT">Có mặt</option><option value="LATE">Đi trễ</option><option value="ABSENT">Vắng mặt</option><option value="EXCUSED">Vắng có phép</option></select></label><label className="ws-field">Lý do điều chỉnh<textarea required value={reason} onChange={event => setReason(event.target.value)} placeholder="Ghi rõ lý do để lưu vào lịch sử điểm danh" /></label><button className="ws-button" disabled={busy}>{busy ? "Đang lưu..." : "Lưu điều chỉnh"}</button></form>}
    </div>
  </section>;
}

export function StudentAttendanceHistory({ context: c }: { context: WorkspaceContext }) {
  const { data = [], error, isLoading, mutate } = useSWR(["my-attendance-details", c.account.id], campusApi.myAttendanceDetails, { revalidateOnFocus: true });
  return <section className="ws-panel ws-attendance-workflow"><div className="ws-panel-header"><div><h3>Lịch sử điểm danh của tôi</h3><p>Kết quả được cập nhật khi giảng viên chốt hoặc điều chỉnh điểm danh.</p></div><button className="ws-button secondary" type="button" onClick={() => void mutate()}><RefreshCw size={15} /> Tải lại</button></div><div className="ws-attendance-workflow-body">{isLoading ? <p role="status">Đang tải lịch sử điểm danh...</p> : error ? <p className="ws-form-error" role="alert">Không tải được lịch sử điểm danh.</p> : !data.length ? <p className="ws-attendance-workflow-empty">Bạn chưa có kết quả điểm danh.</p> : <div className="ws-table-wrap"><table className="ws-table"><thead><tr><th>BUỔI HỌC</th><th>GHẾ</th><th>KẾT QUẢ</th><th>GIỜ CHECK-IN</th></tr></thead><tbody>{data.map(item => { const session = c.data.sessions.find(value => value.id === item.classSessionId); return <tr key={item.id ?? `${item.classSessionId}-${item.seatId}`}><td><strong>{session?.subject ?? `Buổi học #${item.classSessionId}`}</strong><small>{session ? viDate(session.startTime) : ""}</small></td><td>#{item.seatNumber}</td><td><span className="ws-attendance-status">{statusName[item.status]}</span></td><td>{item.checkedInAt ? viTime(item.checkedInAt) : "—"}</td></tr>; })}</tbody></table></div>}</div></section>;
}
