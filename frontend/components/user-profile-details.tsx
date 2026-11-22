"use client";

import useSWR from "swr";
import { campusApi } from "@/lib/campus-api";
import { viDate } from "@/lib/workspace-types";

export function UserProfileDetails({ id }: { id: number }) {
  const { data, error, isLoading, mutate } = useSWR(`admin-user-${id}`, () => campusApi.user(id));
  if (isLoading) return <p role="status">Đang tải hồ sơ...</p>;
  if (error) return <div role="alert"><p>Không tải được hồ sơ.</p><button className="ws-button secondary" onClick={() => void mutate()}>Thử lại</button></div>;
  if (!data) return null;
  return <div className="ws-detail-grid">{[
    ["Mã tài khoản", data.code], ["Xác thực email", data.verified ? "Đã xác thực" : "Chưa xác thực"],
    ["Khoa", data.faculty], ["Ngày sinh", data.birthDate ? viDate(data.birthDate) : null],
    ["Số điện thoại", data.phone], ["Email cá nhân", data.personalEmail],
    ["Lớp", data.className], ["Năm vào trường", data.entryYear],
    ["Ngày tạo", data.createdAt ? viDate(data.createdAt) : null],
  ].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value || "Chưa cập nhật"}</strong></div>)}</div>;
}
