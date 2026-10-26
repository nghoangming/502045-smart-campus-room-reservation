
import { useEffect, useState, type FormEvent } from "react";

type BookingStatus =
    | "Chờ xác nhận"
    | "Đã xác nhận"
    | "Đã từ chối"
    | "Đã hủy";

type Booking = {
    id: number;
    room: string;
    date: string;
    startTime: string;
    endTime: string;
    people: number;
    purpose: string;
    note: string;
    status: BookingStatus;
};

const STORAGE_KEY = "smart-campus-classroom-bookings";

const rooms = [
    { code: "A101", name: "Phòng học A101", capacity: 40, equipment: "Máy chiếu, bảng" },
    { code: "A102", name: "Phòng học A102", capacity: 50, equipment: "Máy chiếu, bảng" },
    { code: "B201", name: "Phòng máy B201", capacity: 35, equipment: "Máy tính, máy chiếu" },
    { code: "B202", name: "Phòng máy B202", capacity: 30, equipment: "Máy tính, bảng" },
];

const today = () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
};

const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    backgroundColor: "#fff",
};

const labelStyle = {
    display: "block",
    marginBottom: "7px",
    fontWeight: 600,
    fontSize: "13px",
    color: "#374151",
};

const detailLabelStyle = {
    color: "#6b7280",
    fontSize: "12px",
    margin: "0 0 6px",
};

const detailValueStyle = {
    color: "#111827",
    fontSize: "14px",
    fontWeight: 600,
    margin: 0,
    overflowWrap: "anywhere" as const,
};

const TIME_OPTIONS = Array.from({ length: 21 }, (_, index) => {
    const minutes = 8 * 60 + index * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function isTimeConflict(
    start: string,
    end: string,
    bookingStart: string,
    bookingEnd: string
) {
    return start < bookingEnd && end > bookingStart;
}

function RoomBooking() {
    const [bookings, setBookings] = useState<Booking[]>(() => {
        try {
            return JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            ) as Booking[];
        } catch {
            return [];
        }
    });

    const [room, setRoom] = useState("A101");
    const [date, setDate] = useState(today());
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("10:00");
    const [people, setPeople] = useState(30);
    const [purpose, setPurpose] = useState("");
    const [note, setNote] = useState("");
    const [message, setMessage] = useState("");
    const [statusFilter, setStatusFilter] = useState("Tất cả");
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    }, [bookings]);

    const selectedRoom = rooms.find((item) => item.code === room)!;

    const availableBookings = bookings.filter(
        (booking) =>
            booking.room === room &&
            booking.date === date &&
            booking.status !== "Đã hủy" &&
            booking.status !== "Đã từ chối"
    );

    const startOptions = TIME_OPTIONS.slice(0, -1).filter((start) =>
        TIME_OPTIONS.some(
            (end) =>
                end > start &&
                !availableBookings.some((booking) =>
                    isTimeConflict(start, end, booking.startTime, booking.endTime)
                )
        )
    );

    const endOptions = TIME_OPTIONS.filter(
        (end) =>
            end > startTime &&
            !availableBookings.some((booking) =>
                isTimeConflict(startTime, end, booking.startTime, booking.endTime)
            )
    );

    useEffect(() => {
        if (startOptions.length && !startOptions.includes(startTime)) {
            setStartTime(startOptions[0]);
        }

        if (endOptions.length && !endOptions.includes(endTime)) {
            setEndTime(endOptions[0]);
        }
    }, [room, date, bookings, startTime, endTime]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage("");

        if (date < today()) {
            setMessage("Ngày đặt phòng không được nằm trong quá khứ.");
            return;
        }

        if (startTime >= endTime) {
            setMessage("Giờ kết thúc phải sau giờ bắt đầu.");
            return;
        }

        if (people < 1 || people > selectedRoom.capacity) {
            setMessage(`Số người phải từ 1 đến ${selectedRoom.capacity}.`);
            return;
        }

        if (!purpose.trim()) {
            setMessage("Vui lòng nhập mục đích sử dụng phòng.");
            return;
        }

        const conflict = bookings.some(
            (booking) =>
                booking.room === room &&
                booking.date === date &&
                booking.status !== "Đã hủy" &&
                booking.status !== "Đã từ chối" &&
                isTimeConflict(startTime, endTime, booking.startTime, booking.endTime)
        );

        if (conflict) {
            setMessage("Phòng đã có yêu cầu đặt trong khung giờ này.");
            return;
        }

        const newBooking: Booking = {
            id: Date.now(),
            room,
            date,
            startTime,
            endTime,
            people,
            purpose: purpose.trim(),
            note: note.trim(),
            status: "Chờ xác nhận",
        };

        setBookings((previous) => [newBooking, ...previous]);
        setPurpose("");
        setNote("");
        setMessage("Đã gửi yêu cầu đặt phòng thành công.");
    };

    const cancelBooking = (id: number) => {
        if (!window.confirm("Bạn có chắc muốn hủy yêu cầu đặt phòng này?")) {
            return;
        }

        setBookings((previous) =>
            previous.map((booking) =>
                booking.id === id && booking.status === "Chờ xác nhận"
                    ? { ...booking, status: "Đã hủy" }
                    : booking
            )
        );

        setSelectedBooking((previous) =>
            previous?.id === id && previous.status === "Chờ xác nhận"
                ? { ...previous, status: "Đã hủy" }
                : previous
        );
    };

    const visibleBookings = bookings.filter(
        (booking) =>
            statusFilter === "Tất cả" || booking.status === statusFilter
    );

    const statusColor = (status: BookingStatus) => {
        if (status === "Đã xác nhận") {
            return { background: "#dcfce7", color: "#166534" };
        }
        if (status === "Đã từ chối") {
            return { background: "#fee2e2", color: "#991b1b" };
        }
        if (status === "Đã hủy") {
            return { background: "#e5e7eb", color: "#374151" };
        }
        return { background: "#fef3c7", color: "#92400e" };
    };

    return (
        <div style={{
            padding: "30px",
            background: "#f5f7fb",
            minHeight: "100vh",
            fontFamily: "Arial, sans-serif",
            color: "#111827",
        }}>
            <div style={{ marginBottom: "24px" }}>
                <p style={{ color: "#2563eb", fontWeight: 700, margin: "0 0 8px" }}>
                    SMART CAMPUS / BOOKING
                </p>
                <h1 style={{ margin: "0 0 8px", fontSize: "28px" }}>
                    Đặt phòng học
                </h1>
                <p style={{ color: "#6b7280", margin: 0 }}>
                    Đăng ký phòng học lý thuyết hoặc phòng máy theo lịch giảng dạy.
                </p>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "22px",
            }}>
                {[
                    { label: "Tổng yêu cầu", value: bookings.length },
                    {
                        label: "Chờ xác nhận",
                        value: bookings.filter((b) => b.status === "Chờ xác nhận").length,
                    },
                    {
                        label: "Đã xác nhận",
                        value: bookings.filter((b) => b.status === "Đã xác nhận").length,
                    },
                ].map((item) => (
                    <div key={item.label} style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "20px",
                    }}>
                        <div style={{ color: "#6b7280", fontSize: "13px" }}>
                            {item.label}
                        </div>
                        <div style={{ fontSize: "28px", fontWeight: 700, marginTop: "8px" }}>
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "20px",
                alignItems: "start",
            }}>
                <form onSubmit={handleSubmit} style={{
                    background: "#fff",
                    padding: "24px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                }}>
                    <h2 style={{ fontSize: "19px", marginTop: 0 }}>
                        Thông tin đặt phòng
                    </h2>

                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>Phòng học</label>
                        <select
                            value={room}
                            onChange={(e) => {
                                setRoom(e.target.value);
                                setMessage("");
                            }}
                            style={inputStyle}
                        >
                            {rooms.map((item) => (
                                <option key={item.code} value={item.code}>
                                    {item.code} - {item.name}
                                </option>
                            ))}
                        </select>
                        <p style={{ color: "#6b7280", fontSize: "12px" }}>
                            Sức chứa: {selectedRoom.capacity} người · {selectedRoom.equipment}
                        </p>
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>Ngày sử dụng</label>
                        <input
                            type="date"
                            min={today()}
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                setMessage("");
                            }}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                        marginBottom: "16px",
                    }}>
                        <div>
                            <label style={labelStyle}>Giờ bắt đầu</label>
                            <select
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                                style={inputStyle}
                            >
                                {TIME_OPTIONS.slice(0, -1).map((time) => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Giờ kết thúc</label>
                            <select
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                                style={inputStyle}
                            >
                                {TIME_OPTIONS.filter((time) => time > startTime).map((time) => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>Số người sử dụng</label>
                        <input
                            type="number"
                            min={1}
                            max={selectedRoom.capacity}
                            value={people}
                            onChange={(e) => setPeople(Number(e.target.value))}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>Mục đích sử dụng</label>
                        <input
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="Ví dụ: Dạy học môn Java"
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ marginBottom: "18px" }}>
                        <label style={labelStyle}>Ghi chú</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Thiết bị hoặc yêu cầu bổ sung..."
                            rows={3}
                            style={{ ...inputStyle, resize: "vertical" }}
                        />
                    </div>

                    {message && (
                        <p role="status" style={{
                            background: message.startsWith("Đã gửi") ? "#dcfce7" : "#fee2e2",
                            color: message.startsWith("Đã gửi") ? "#166534" : "#991b1b",
                            padding: "12px",
                            borderRadius: "8px",
                            fontSize: "13px",
                        }}>
                            {message}
                        </p>
                    )}

                    <button type="submit" style={{
                        width: "100%",
                        padding: "12px",
                        background: "#2563eb",
                        color: "#fff",
                        border: 0,
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor: "pointer",
                    }}>
                        Gửi yêu cầu đặt phòng
                    </button>
                </form>

                <section style={{
                    background: "#fff",
                    padding: "24px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    overflowX: "auto",
                }}>
                    <h2 style={{ fontSize: "19px", marginTop: 0 }}>
                        Lịch sử đặt phòng
                    </h2>

                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>Lọc trạng thái</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ ...inputStyle, maxWidth: "240px" }}
                        >
                            {["Tất cả", "Chờ xác nhận", "Đã xác nhận", "Đã từ chối", "Đã hủy"].map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </div>

                    {visibleBookings.length === 0 ? (
                        <p style={{ color: "#6b7280", padding: "24px 0" }}>
                            Chưa có yêu cầu đặt phòng nào.
                        </p>
                    ) : (
                        <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "13px",
                            minWidth: "620px",
                        }}>
                            <thead>
                                <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                                    {["Phòng / Ngày", "Thời gian", "Mục đích", "Trạng thái", "Thao tác"].map((item) => (
                                        <th key={item} style={{
                                            padding: "12px",
                                            borderBottom: "1px solid #e5e7eb",
                                        }}>
                                            {item}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleBookings.map((booking) => (
                                    <tr key={booking.id}>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                            <strong>{booking.room}</strong>
                                            <br />{booking.date}
                                            <br />{booking.people} người
                                        </td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                            {booking.startTime} – {booking.endTime}
                                        </td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                            {booking.purpose}
                                        </td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                            <span style={{
                                                ...statusColor(booking.status),
                                                padding: "5px 8px",
                                                borderRadius: "6px",
                                                whiteSpace: "nowrap",
                                            }}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>
                                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedBooking(booking)}
                                                    style={{
                                                        border: 0,
                                                        background: "#eff6ff",
                                                        color: "#2563eb",
                                                        padding: "7px 10px",
                                                        borderRadius: "6px",
                                                        cursor: "pointer",
                                                        fontWeight: 600,
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    Chi tiết
                                                </button>

                                                {booking.status === "Chờ xác nhận" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => cancelBooking(booking.id)}
                                                        style={{
                                                            border: 0,
                                                            color: "#dc2626",
                                                            background: "transparent",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Hủy
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>

            {selectedBooking && (
                <div
                    onClick={() => setSelectedBooking(null)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(15, 23, 42, 0.55)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "20px",
                        zIndex: 1000,
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="room-booking-detail-title"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "#fff",
                            width: "100%",
                            maxWidth: "560px",
                            maxHeight: "85vh",
                            overflowY: "auto",
                            borderRadius: "16px",
                            padding: "26px",
                            boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
                        }}
                    >
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "8px",
                        }}>
                            <h2 id="room-booking-detail-title" style={{ margin: 0, fontSize: "22px" }}>
                                Chi tiết đặt phòng
                            </h2>
                            <button
                                type="button"
                                onClick={() => setSelectedBooking(null)}
                                aria-label="Đóng chi tiết"
                                style={{
                                    border: 0,
                                    background: "#f3f4f6",
                                    borderRadius: "8px",
                                    padding: "8px 12px",
                                    cursor: "pointer",
                                    fontSize: "18px",
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "22px" }}>
                            Mã đặt phòng: #{selectedBooking.id}
                        </p>

                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "16px",
                        }}>
                            <div>
                                <p style={detailLabelStyle}>Tên phòng</p>
                                <p style={detailValueStyle}>
                                    {rooms.find((r) => r.code === selectedBooking.room)?.name}
                                </p>
                            </div>
                            <div>
                                <p style={detailLabelStyle}>Mã phòng</p>
                                <p style={detailValueStyle}>{selectedBooking.room}</p>
                            </div>
                            <div>
                                <p style={detailLabelStyle}>Ngày sử dụng</p>
                                <p style={detailValueStyle}>{selectedBooking.date}</p>
                            </div>
                            <div>
                                <p style={detailLabelStyle}>Thời gian</p>
                                <p style={detailValueStyle}>
                                    {selectedBooking.startTime} – {selectedBooking.endTime}
                                </p>
                            </div>
                            <div>
                                <p style={detailLabelStyle}>Số người</p>
                                <p style={detailValueStyle}>{selectedBooking.people} người</p>
                            </div>
                            <div>
                                <p style={detailLabelStyle}>Sức chứa phòng</p>
                                <p style={detailValueStyle}>
                                    {rooms.find((r) => r.code === selectedBooking.room)?.capacity} người
                                </p>
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                                <p style={detailLabelStyle}>Mục đích sử dụng</p>
                                <p style={detailValueStyle}>{selectedBooking.purpose}</p>
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                                <p style={detailLabelStyle}>Thiết bị phòng</p>
                                <p style={detailValueStyle}>
                                    {rooms.find((r) => r.code === selectedBooking.room)?.equipment}
                                </p>
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                                <p style={detailLabelStyle}>Ghi chú</p>
                                <p style={detailValueStyle}>
                                    {selectedBooking.note || "Không có ghi chú"}
                                </p>
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                                <p style={detailLabelStyle}>Trạng thái</p>
                                <span style={{
                                    ...statusColor(selectedBooking.status),
                                    display: "inline-block",
                                    padding: "7px 12px",
                                    borderRadius: "8px",
                                    fontWeight: 600,
                                    fontSize: "13px",
                                }}>
                                    {selectedBooking.status}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setSelectedBooking(null)}
                            style={{
                                width: "100%",
                                marginTop: "26px",
                                padding: "12px",
                                background: "#2563eb",
                                color: "#fff",
                                border: 0,
                                borderRadius: "8px",
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RoomBooking;
