"use client";
import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { campusApi, type ApiResource } from "@/lib/campus-api";

export function ResourceEditor({ id, close, saved }: { id: number; close: () => void; saved: (resource: ApiResource) => void }) {
  const { data, error, isLoading, mutate } = useSWR(`resource-detail-${id}`, () => campusApi.resource(id));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!data || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setFailure("");
    try {
      const result = await campusApi.updateResource(id, { name: String(form.get("name")).trim(), type: String(form.get("type")).trim(), quantity: Number(form.get("quantity")), status: String(form.get("status")) as ApiResource["status"] });
      saved(result); close();
    } catch (cause) { setFailure(cause instanceof Error ? cause.message : "Không thể lưu thiết bị."); }
    finally { setBusy(false); }
  };
  return <section className="ws-panel ws-resource-editor" aria-label="Chỉnh sửa thiết bị">
    <div className="ws-panel-header"><h3>Thông tin thiết bị</h3><button className="ws-button secondary" type="button" disabled={busy} onClick={close} aria-label="Đóng chỉnh sửa thiết bị">×</button></div>
    {isLoading && <p role="status">Đang tải thiết bị...</p>}
    {error && <p role="alert">Không tải được thiết bị. <button type="button" onClick={() => void mutate()}>Thử lại</button></p>}
    {data && <form className="ws-form" onSubmit={submit} key={data.id}>
      <label className="ws-field">Tên thiết bị<input name="name" required maxLength={20} defaultValue={data.name} /></label>
      <label className="ws-field">Loại thiết bị<input name="type" required maxLength={20} defaultValue={data.type} /></label>
      <label className="ws-field">Số lượng<input name="quantity" type="number" required min={0} step={1} defaultValue={data.quantity} /></label>
      <label className="ws-field">Trạng thái<select name="status" defaultValue={data.status}><option value="AVAILABLE">Sẵn sàng</option><option value="IN_USE">Đang sử dụng</option><option value="BROKEN">Hỏng</option><option value="MAINTENANCE">Bảo trì</option></select></label>
      {failure && <p role="alert" className="ws-form-error">{failure}</p>}
      <button className="ws-button" disabled={busy}>{busy ? "Đang lưu..." : "Lưu thay đổi"}</button>
    </form>}
  </section>;
}
