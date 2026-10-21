import { useState, useEffect } from "react";
import {
    fetchRooms,
    fetchRoomSchedule,
    fetchAvailableRooms,
    type RoomDto,
} from "../services/api";

interface ScheduleRow {
    id: string;
    room: string;
    roomName: string;
    location: string;
    time: string;
    status: string;
}

// Dữ liệu lịch mẫu dự phòng khi chạy độc lập không có Backend (ví dụ trong CI E2E test)
const FALLBACK_ROOM_CODES = ["A101", "A102", "B201", "B202", "C301", "C302"];

const FALLBACK_ROWS: ScheduleRow[] = [
    { id: "1", room: "A101", roomName: "Lecture Room A101", location: "Building A - Floor 1", time: "08:00 - 10:00", status: "Occupied" },
    { id: "2", room: "A102", roomName: "Lecture Room A102", location: "Building A - Floor 1", time: "09:00 - 11:00", status: "Occupied" },
    { id: "3", room: "B201", roomName: "Computer Lab B201", location: "Building B - Floor 2", time: "13:00 - 15:00", status: "Occupied" },
    { id: "4", room: "B202", roomName: "Computer Lab B202", location: "Building B - Floor 2", time: "13:00 - 15:00", status: "Occupied" },
    { id: "5", room: "C301", roomName: "Study Room C301", location: "Building C - Floor 3", time: "08:00 - 10:00", status: "Occupied" },
    { id: "6", room: "C302", roomName: "Study Room C302", location: "Building C - Floor 3", time: "15:00 - 17:00", status: "Available" },
];

function formatTimeVN(isoDateTime: string): string {
    try {
        return new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(isoDateTime));
    } catch {
        return isoDateTime;
    }
}

function RoomSchedule() {
    const [date, setDate] = useState("2026-10-16");
    const [roomFilter, setRoomFilter] = useState("All Rooms");
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("10:00");

    // States danh sách phòng, lịch trình và phòng trống từ Backend
    const [roomOptions, setRoomOptions] = useState<string[]>(FALLBACK_ROOM_CODES);
    const [schedules, setSchedules] = useState<ScheduleRow[]>(FALLBACK_ROWS);
    const [availableRooms, setAvailableRooms] = useState<RoomDto[]>([]);

    // States xử lý Loading và Error
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Tải danh sách phòng + lịch từng phòng (GET /api/v1/rooms & GET /api/v1/rooms/{id}/schedule)
    // đồng thời kiểm tra phòng trống (GET /api/v1/rooms/availability)
    const loadSchedulesFromBackend = async () => {
        if (!date) return;
        setLoading(true);
        setError(null);

        try {
            const rooms = await fetchRooms();
            if (rooms && rooms.length > 0) {
                setRoomOptions(rooms.map((r) => r.code));
            }

            // Gọi song song GET /api/v1/rooms/{id}/schedule?date=YYYY-MM-DD cho từng phòng
            const perRoomSchedules = await Promise.all(
                rooms.map(async (room) => {
                    const bookings = await fetchRoomSchedule(room.id, date);
                    if (bookings.length > 0) {
                        return bookings.map((b) => ({
                            id: `${room.id}-${b.bookingId}`,
                            room: room.code,
                            roomName: room.name,
                            location: room.location || "—",
                            time: `${formatTimeVN(b.startTime)} - ${formatTimeVN(b.endTime)}`,
                            status: b.status || "Occupied",
                        }));
                    }
                    // Nếu phòng không có lịch đặt trong ngày đó
                    const isUnavailable = ["INACTIVE", "MAINTENANCE", "CLOSED"].includes(
                        (room.status || "").toUpperCase()
                    );
                    return [
                        {
                            id: `${room.id}-empty`,
                            room: room.code,
                            roomName: room.name,
                            location: room.location || "—",
                            time: "No booking on this date",
                            status: isUnavailable ? room.status : "Available",
                        },
                    ];
                })
            );

            setSchedules(perRoomSchedules.flat());

            // Gọi thêm GET /api/v1/rooms/availability nếu khung giờ hợp lệ
            if (startTime && endTime && startTime < endTime) {
                const avail = await fetchAvailableRooms(date, startTime, endTime);
                setAvailableRooms(avail);
            }
        } catch (err: any) {
            // Khi chưa bật Backend, giữ dữ liệu mẫu để giao diện và E2E test vẫn hoạt động mượt
            setError(err.message || "Backend is offline. Displaying preview schedule data.");
            setRoomOptions(FALLBACK_ROOM_CODES);
            setSchedules(FALLBACK_ROWS);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchedulesFromBackend();
    }, [date, startTime, endTime]);

    // Lọc theo mã phòng được chọn trên dropdown
    const filteredSchedules =
        roomFilter === "All Rooms"
            ? schedules
            : schedules.filter((item) => item.room === roomFilter);

    return (
        <div style={containerStyle}>
            <h1 style={{ margin: "0 0 8px", color: "#111827", fontSize: "24px" }}>
                Room Schedule
            </h1>
            <p style={{ marginBottom: "24px", color: "#6b7280", fontSize: "14px" }}>
                View room schedules and availability across campus (Vietnam time UTC+7).
            </p>

            {/* Filter Bar */}
            <div style={filterCardStyle}>
                <div>
                    <label style={labelStyle}>Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <div>
                    <label style={labelStyle}>Room Filter</label>
                    <select
                        value={roomFilter}
                        onChange={(e) => setRoomFilter(e.target.value)}
                        style={{ ...inputStyle, minWidth: "160px" }}
                    >
                        <option value="All Rooms">All Rooms</option>
                        {roomOptions.map((code) => (
                            <option key={code} value={code}>
                                {code}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label style={labelStyle}>Start Time</label>
                    <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <div>
                    <label style={labelStyle}>End Time</label>
                    <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <button
                    type="button"
                    onClick={loadSchedulesFromBackend}
                    style={primaryBtnStyle}
                    disabled={loading}
                >
                    {loading ? "Refreshing..." : "Refresh API"}
                </button>
            </div>

            {/* Thông báo nếu Backend chưa bật */}
            {error && (
                <div style={warningBannerStyle}>
                    <span>ℹ️ {error}</span>
                    <button onClick={loadSchedulesFromBackend} style={retryBtnStyle}>
                        Retry
                    </button>
                </div>
            )}

            {/* BẢNG LỊCH TRÌNH */}
            <div style={tableCardStyle}>
                <h2 style={{ marginTop: 0, color: "#111827", fontSize: "18px", marginBottom: "16px" }}>
                    Schedule: {date}
                </h2>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "650px" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#f9fafb" }}>
                                <th style={thStyle}>Room</th>
                                <th style={thStyle}>Room Name</th>
                                <th style={thStyle}>Location</th>
                                <th style={thStyle}>Time</th>
                                <th style={thStyle}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSchedules.map((item) => {
                                const isAvailable = item.status === "Available";
                                return (
                                    <tr key={item.id}>
                                        <td style={tdStyle}>
                                            <strong>{item.room}</strong>
                                        </td>
                                        <td style={tdStyle}>{item.roomName}</td>
                                        <td style={tdStyle}>{item.location}</td>
                                        <td style={tdStyle}>{item.time}</td>
                                        <td style={tdStyle}>
                                            <span
                                                style={{
                                                    padding: "4px 10px",
                                                    borderRadius: "6px",
                                                    backgroundColor: isAvailable ? "#dcfce7" : "#dbeafe",
                                                    color: isAvailable ? "#15803d" : "#2563eb",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Danh sách phòng trống trong khung giờ đã chọn (GET /api/v1/rooms/availability) */}
            {availableRooms.length > 0 && (
                <div style={{ ...tableCardStyle, marginTop: "20px" }}>
                    <h2 style={{ marginTop: 0, color: "#111827", fontSize: "18px", marginBottom: "12px" }}>
                        Available Rooms ({startTime} - {endTime})
                    </h2>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {availableRooms.map((r) => (
                            <span
                                key={r.id}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    backgroundColor: "#dcfce7",
                                    color: "#15803d",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                }}
                            >
                                {r.code} — {r.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline Styles
const containerStyle = { minHeight: "100vh", backgroundColor: "#f5f7fb", padding: "28px 32px", boxSizing: "border-box" as const, fontFamily: "Arial, sans-serif" };
const filterCardStyle = { backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", marginBottom: "20px", display: "flex", flexWrap: "wrap" as const, gap: "20px", alignItems: "flex-end", border: "1px solid #e5e7eb" };
const tableCardStyle = { backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" };
const warningBannerStyle = { backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "10px 16px", borderRadius: "8px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" };
const retryBtnStyle = { backgroundColor: "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" as const, fontSize: "12px" };
const labelStyle = { display: "block", marginBottom: "6px", fontWeight: "bold" as const, fontSize: "12px", color: "#374151" };
const inputStyle = { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", width: "100%", boxSizing: "border-box" as const, fontSize: "14px", outline: "none" };
const primaryBtnStyle = { padding: "10px 18px", border: "none", borderRadius: "8px", backgroundColor: "#2563eb", color: "#ffffff", cursor: "pointer", fontWeight: "bold" as const, fontSize: "14px" };
const thStyle = { textAlign: "left" as const, padding: "14px", borderBottom: "1px solid #e5e7eb", color: "#374151", fontSize: "14px" };
const tdStyle = { padding: "14px", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontSize: "14px" };

export default RoomSchedule;
