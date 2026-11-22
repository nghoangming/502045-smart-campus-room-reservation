import type { ReactNode } from "react";
import type { ApiSeat, ApiRoom } from "@/lib/campus-api";

type ClassroomType = Extract<ApiRoom["type"], "THEORY" | "LAB">;

export function RoomSeatLayout({ seats, roomType, renderSeat }: {
  seats: ApiSeat[];
  roomType: ClassroomType;
  renderSeat: (seat: ApiSeat) => ReactNode;
}) {
  const perRow = roomType === "LAB" ? 6 : 10;
  const sorted = [...seats].sort((a, b) => a.seatNumber - b.seatNumber);
  const rows = Array.from({ length: Math.ceil(sorted.length / perRow) }, (_, index) =>
    sorted.slice(index * perRow, (index + 1) * perRow));

  return <div className="ws-room-seat-layout" data-room-type={roomType.toLowerCase()}>
    <div className="ws-room-seat-front">{roomType === "LAB" ? "BÀN GIẢNG VIÊN · PHÒNG MÁY" : "BẢNG GIẢNG DẠY"}</div>
    <div className="ws-room-seat-scroll">
      <div className="ws-room-seat-rows">
        {rows.map((row, rowIndex) => <div className="ws-room-seat-row" key={rowIndex}>
          {row.map((seat, seatIndex) => <div className="ws-room-seat-cell" key={seat.id}>
            {renderSeat(seat)}
            {roomType === "LAB" && seatIndex === 2 && <span className="ws-room-seat-aisle" aria-hidden="true" />}
          </div>)}
        </div>)}
      </div>
    </div>
    <p className="ws-room-seat-note">Sơ đồ mô phỏng theo số ghế; vị trí bàn thực tế chưa được cấu hình.</p>
  </div>;
}
