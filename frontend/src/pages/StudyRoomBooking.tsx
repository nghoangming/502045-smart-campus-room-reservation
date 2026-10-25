
import { useEffect, useState, type FormEvent } from "react";
import SeatPicker from "./SeatPicker";

type BookingStatus =
    | "Chờ xác nhận"
    | "Đã xác nhận"
    | "Đã từ chối"
    | "Đã hủy";

type StudyBooking = {
    id: number;
    room: string;
    date: string;
    startTime: string;
    endTime: string;
    people: number;
    seats?: number[];
    purpose: string;
    status: BookingStatus;
};

type MessageType = "success" | "error" | "";

const STORAGE_KEY = "smart-campus-study-room-bookings";

const rooms = [
    {
        code: "C301",
        name: "Phòng tự học C301",
        capacity: 8,
        location: "Tòa C - Tầng 3",
    },
    {
        code: "C302",
        name: "Phòng tự học C302",
        capacity: 10,
        location: "Tòa C - Tầng 3",
    },
    {
        code: "C303",
        name: "Phòng tự học nhóm C303",
        capacity: 12,
        location: "Tòa C - Tầng 3",
    },
];

const today = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();

    return new Date(
        date.getTime() - offset * 60000
    ).toISOString().slice(0, 10);
};

const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    backgroundColor: "#ffffff",
};

const labelStyle = {
    display: "block",
    marginBottom: "7px",
    fontWeight: 600,
    fontSize: "13px",
    color: "#374151",
};

const TIME_OPTIONS = Array.from({ length: 21 }, (_, index) => {
    const totalMinutes = 8 * 60 + index * 30;
    const hours = Math.floor(totalMinutes / 60)
        .toString()
        .padStart(2, "0");
    const minutes = (totalMinutes % 60)
        .toString()
        .padStart(2, "0");

    return `${hours}:${minutes}`;
});

function isTimeConflict(
    startTime: string,
    endTime: string,
    bookingStart: string,
    bookingEnd: string
) {
    return startTime < bookingEnd && endTime > bookingStart;
}

function StudyRoomBooking() {
    const [bookings, setBookings] = useState<StudyBooking[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const parsed = saved ? JSON.parse(saved) : [];

            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });

    const [room, setRoom] = useState("C301");
    const [date, setDate] = useState(today());
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("10:00");
    const [people, setPeople] = useState(4);
    const [selectedSeats, setSelectedSeats] = useState<number[]>([
        1, 2, 3, 4,
    ]);
    const [purpose, setPurpose] = useState("Tự học nhóm");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] =
        useState<MessageType>("");
    const [statusFilter, setStatusFilter] = useState("Tất cả");

    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(bookings)
            );
        } catch {
            // Khong the luu du lieu trong trinh duyet.
        }
    }, [bookings]);

    const selectedRoom = rooms.find(
        (item) => item.code === room
    )!;

    const activeBookings = bookings.filter(
        (booking) =>
            booking.room === room &&
            booking.date === date &&
            booking.status !== "Đã hủy" &&
            booking.status !== "Đã từ chối"
    );

    const unavailableSeats = Array.from(
        new Set(
            activeBookings
                .filter((booking) =>
                    isTimeConflict(
                        startTime,
                        endTime,
                        booking.startTime,
                        booking.endTime
                    )
                )
                .flatMap((booking) =>
                    Array.isArray(booking.seats)
                        ? booking.seats
                        : Array.from(
                              { length: selectedRoom.capacity },
                              (_, index) => index + 1
                          )
                )
        )
    );

    useEffect(() => {
        setSelectedSeats((previous) =>
            previous.filter(
                (seat) => !unavailableSeats.includes(seat)
            )
        );
        setMessage("");
        setMessageType("");
    }, [room, date, startTime, endTime]);

    const showError = (text: string) => {
        setMessage(text);
        setMessageType("error");
    };

    const handleSubmit = (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setMessage("");
        setMessageType("");

        if (!date || date < today()) {
            showError(
                "Vui lòng chọn ngày hôm nay hoặc ngày trong tương lai."
            );
            return;
        }

        if (startTime >= endTime) {
            showError("Giờ kết thúc phải sau giờ bắt đầu.");
            return;
        }

        if (people < 1 || people > selectedRoom.capacity) {
            showError(
                `Số người phải từ 1 đến ${selectedRoom.capacity} người.`
            );
            return;
        }

        if (!purpose.trim()) {
            showError("Vui lòng nhập mục đích sử dụng phòng.");
            return;
        }

        if (selectedSeats.length !== people) {
            showError(
                "Số ghế đã chọn phải bằng số người đăng ký."
            );
            return;
        }

        if (
            selectedSeats.some((seat) =>
                unavailableSeats.includes(seat)
            )
        ) {
            showError(
                "Có ghế đã được đặt. Vui lòng chọn ghế khác."
            );
            return;
        }

        const conflict = bookings.some((booking) => {
            if (
                booking.room !== room ||
                booking.date !== date ||
                booking.status === "Đã hủy" ||
                booking.status === "Đã từ chối" ||
                !isTimeConflict(
                    startTime,
                    endTime,
                    booking.startTime,
                    booking.endTime
                )
            ) {
                return false;
            }

            const occupiedSeats = Array.isArray(booking.seats)
                ? booking.seats
                : Array.from(
                      { length: selectedRoom.capacity },
                      (_, index) => index + 1
                  );

            return selectedSeats.some((seat) =>
                occupiedSeats.includes(seat)
            );
        });

        if (conflict) {
            showError(
                "Ghế đã được đặt trong khung giờ này. Vui lòng chọn ghế khác."
            );
            return;
        }

        const newBooking: StudyBooking = {
            id: Date.now(),
            room,
            date,
            startTime,
            endTime,
            people,
            seats: [...selectedSeats].sort((a, b) => a - b),
            purpose: purpose.trim(),
            status: "Chờ xác nhận",
        };

        setBookings((previous) => [
            newBooking,
            ...previous,
        ]);

        setMessage(
            "Đã gửi yêu cầu đặt phòng tự học thành công."
        );
        setMessageType("success");
    };

    const cancelBooking = (id: number) => {
        setBookings((previous) =>
            previous.map((booking) =>
                booking.id === id &&
                booking.status === "Chờ xác nhận"
                    ? { ...booking, status: "Đã hủy" }
                    : booking
            )
        );

        setMessage("Đã hủy yêu cầu đặt phòng.");
        setMessageType("success");
    };

    const visibleBookings = bookings.filter(
        (booking) =>
            statusFilter === "Tất cả" ||
            booking.status === statusFilter
    );

    const statusColor = (status: BookingStatus) => {
        if (status === "Đã xác nhận") {
            return {
                background: "#dcfce7",
                color: "#166534",
            };
        }

        if (status === "Đã từ chối") {
            return {
                background: "#fee2e2",
                color: "#991b1b",
            };
        }

        if (status === "Đã hủy") {
            return {
                background: "#e5e7eb",
                color: "#374151",
            };
        }

        return {
            background: "#fef3c7",
            color: "#92400e",
        };
    };

    return (
        <div
            style={{
                padding: "30px",
                background: "#f5f7fb",
                minHeight: "100vh",
                fontFamily: "Arial, sans-serif",
                color: "#111827",
            }}
        >
            <div style={{ marginBottom: "24px" }}>
                <p
                    style={{
                        color: "#0d9488",
                        fontWeight: 700,
                        margin: "0 0 8px",
                    }}
                >
                    SMART CAMPUS / STUDY ROOM
                </p>

                <h1 style={{ margin: "0 0 8px", fontSize: "28px" }}>
                    Đặt phòng tự học
                </h1>

                <p style={{ color: "#6b7280", margin: 0 }}>
                    Tìm và đăng ký phòng tự học cá nhân hoặc học nhóm
                    trong khuôn viên trường.
                </p>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px",
                    marginBottom: "22px",
                }}
            >
                {[
                    {
                        label: "Tổng yêu cầu",
                        value: bookings.length,
                    },
                    {
                        label: "Chờ xác nhận",
                        value: bookings.filter(
                            (b) => b.status === "Chờ xác nhận"
                        ).length,
                    },
                    {
                        label: "Đã xác nhận",
                        value: bookings.filter(
                            (b) => b.status === "Đã xác nhận"
                        ).length,
                    },
                ].map((item) => (
                    <div
                        key={item.label}
                        style={{
                            background: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "12px",
                            padding: "20px",
                        }}
                    >
                        <div
                            style={{
                                color: "#6b7280",
                                fontSize: "13px",
                            }}
                        >
                            {item.label}
                        </div>

                        <div
                            style={{
                                fontSize: "28px",
                                fontWeight: 700,
                                marginTop: "8px",
                            }}
                        >
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
                    gap: "20px",
                    alignItems: "start",
                }}
            >
                <form
                    onSubmit={handleSubmit}
                    noValidate
                    style={{
                        background: "#ffffff",
                        padding: "24px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                    }}
                >
                    <h2
                        style={{
                            fontSize: "19px",
                            marginTop: 0,
                        }}
                    >
                        Đăng ký phòng tự học
                    </h2>

                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>Chọn phòng</label>

                        <select
                            value={room}
                            onChange={(e) => {
                                const nextRoom = rooms.find(
                                    (item) => item.code === e.target.value
                                )!;

                                setRoom(e.target.value);
                                setPeople(
                                    Math.min(people, nextRoom.capacity)
                                );
                                setSelectedSeats([]);
                                setMessage("");
                                setMessageType("");
                            }}
                            style={inputStyle}
                        >
                            {rooms.map((item) => (
                                <option
                                    key={item.code}
                                    value={item.code}
                                >
                                    {item.code} - {item.name}
                                </option>
                            ))}
                        </select>

                        <p
                            style={{
                                color: "#6b7280",
                                fontSize: "12px",
                                marginBottom: 0,
                            }}
                        >
                            {selectedRoom.location} · Sức chứa{" "}
                            {selectedRoom.capacity} người
                        </p>
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>Ngày tự học</label>

                        <input
                            type="date"
                            min={today()}
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                setSelectedSeats([]);
                                setMessage("");
                                setMessageType("");
                            }}
                            style={inputStyle}
                        />
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "12px",
                            marginBottom: "16px",
                        }}
                    >
                        <div>
                            <label style={labelStyle}>
                                Giờ bắt đầu
                            </label>

                            <select
                                value={startTime}
                                onChange={(e) => {
                                    const nextStart = e.target.value;
                                    setStartTime(nextStart);

                                    if (nextStart >= endTime) {
                                        const nextEnd = TIME_OPTIONS.find(
                                            (time) => time > nextStart
                                        );

                                        if (nextEnd) {
                                            setEndTime(nextEnd);
                                        }
                                    }

                                    setSelectedSeats([]);
                                    setMessage("");
                                    setMessageType("");
                                }}
                                style={inputStyle}
                            >
                                {TIME_OPTIONS.slice(0, -1).map(
                                    (time) => (
                                        <option key={time} value={time}>
                                            {time}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div>
                            <label style={labelStyle}>
                                Giờ kết thúc
                            </label>

                            <select
                                value={endTime}
                                onChange={(e) => {
                                    setEndTime(e.target.value);
                                    setSelectedSeats([]);
                                    setMessage("");
                                    setMessageType("");
                                }}
                                style={inputStyle}
                            >
                                {TIME_OPTIONS.filter(
                                    (time) => time > startTime
                                ).map((time) => (
                                    <option key={time} value={time}>
                                        {time}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>
                            Chọn ghế ({selectedSeats.length} ghế đã chọn)
                        </label>

                        <SeatPicker
                            totalSeats={selectedRoom.capacity}
                            selectedSeats={selectedSeats}
                            unavailableSeats={unavailableSeats}
                            accentColor="#0d9488"
                            onChange={(nextSeats: number[]) => {
                                setSelectedSeats(nextSeats);
                                setMessage("");
                                setMessageType("");
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>Số người</label>

                        <input
                            type="number"
                            value={people === 0 ? "" : people}
                            onChange={(e) => {
                                const value = e.target.value;

                                setPeople(
                                    value === "" ? 0 : Number(value)
                                );

                                setMessage("");
                                setMessageType("");
                            }}
                            style={inputStyle}
                        />

                        <p
                            style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                marginBottom: 0,
                            }}
                        >
                            Số người phải bằng số ghế đã chọn và không
                            vượt quá sức chứa của phòng.
                        </p>
                    </div>

                    <div style={{ marginBottom: "18px" }}>
                        <label style={labelStyle}>
                            Mục đích sử dụng
                        </label>

                        <select
                            value={purpose}
                            onChange={(e) => {
                                setPurpose(e.target.value);
                                setMessage("");
                                setMessageType("");
                            }}
                            style={inputStyle}
                        >
                            <option value="Tự học cá nhân">
                                Tự học cá nhân
                            </option>
                            <option value="Tự học nhóm">
                                Tự học nhóm
                            </option>
                            <option value="Làm bài tập nhóm">
                                Làm bài tập nhóm
                            </option>
                            <option value="Chuẩn bị thuyết trình">
                                Chuẩn bị thuyết trình
                            </option>
                            <option value="Ôn thi">Ôn thi</option>
                        </select>
                    </div>

                    {message && (
                        <div
                            role={
                                messageType === "error"
                                    ? "alert"
                                    : "status"
                            }
                            style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "10px",
                                padding: "13px 15px",
                                marginBottom: "16px",
                                borderRadius: "8px",
                                border: `1px solid ${
                                    messageType === "success"
                                        ? "#86efac"
                                        : "#fca5a5"
                                }`,
                                background:
                                    messageType === "success"
                                        ? "#f0fdf4"
                                        : "#fef2f2",
                                color:
                                    messageType === "success"
                                        ? "#166534"
                                        : "#991b1b",
                                fontSize: "13px",
                                lineHeight: 1.5,
                            }}
                        >
                            <span style={{ fontWeight: 700 }}>
                                {messageType === "success" ? "✓" : "⚠"}
                            </span>
                            <span>{message}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        style={{
                            width: "100%",
                            padding: "12px",
                            background: "#0d9488",
                            color: "#ffffff",
                            border: 0,
                            borderRadius: "8px",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        Gửi yêu cầu đặt phòng
                    </button>
                </form>

                <section
                    style={{
                        background: "#ffffff",
                        padding: "24px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        overflowX: "auto",
                    }}
                >
                    <h2
                        style={{
                            fontSize: "19px",
                            marginTop: 0,
                        }}
                    >
                        Lịch sử đặt phòng tự học
                    </h2>

                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>
                            Lọc trạng thái
                        </label>

                        <select
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(e.target.value)
                            }
                            style={{
                                ...inputStyle,
                                maxWidth: "240px",
                            }}
                        >
                            {[
                                "Tất cả",
                                "Chờ xác nhận",
                                "Đã xác nhận",
                                "Đã từ chối",
                                "Đã hủy",
                            ].map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>

                    {visibleBookings.length === 0 ? (
                        <p
                            style={{
                                color: "#6b7280",
                                padding: "24px 0",
                            }}
                        >
                            Bạn chưa có yêu cầu đặt phòng tự học.
                        </p>
                    ) : (
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "13px",
                                minWidth: "600px",
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        textAlign: "left",
                                        background: "#f9fafb",
                                    }}
                                >
                                    {[
                                        "Phòng / Ngày",
                                        "Thời gian",
                                        "Số người / Ghế",
                                        "Mục đích",
                                        "Trạng thái",
                                        "Thao tác",
                                    ].map((item) => (
                                        <th
                                            key={item}
                                            style={{
                                                padding: "12px",
                                                borderBottom:
                                                    "1px solid #e5e7eb",
                                            }}
                                        >
                                            {item}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {visibleBookings.map((booking) => (
                                    <tr key={booking.id}>
                                        <td
                                            style={{
                                                padding: "12px",
                                                borderBottom:
                                                    "1px solid #e5e7eb",
                                            }}
                                        >
                                            <strong>{booking.room}</strong>
                                            <br />
                                            {booking.date}
                                        </td>

                                        <td
                                            style={{
                                                padding: "12px",
                                                borderBottom:
                                                    "1px solid #e5e7eb",
                                            }}
                                        >
                                            {booking.startTime}–
                                            {booking.endTime}
                                        </td>

                                        <td
                                            style={{
                                                padding: "12px",
                                                borderBottom:
                                                    "1px solid #e5e7eb",
                                            }}
                                        >
                                            {booking.people} người
                                            <br />
                                            <span
                                                style={{
                                                    color: "#64748b",
                                                    fontSize: "12px",
                                                }}
                                            >
                                                Ghế:{" "}
                                                {booking.seats?.join(", ") ||
                                                    "Chưa lưu"}
                                            </span>
                                        </td>

                                        <td
                                            style={{
                                                padding: "12px",
                                                borderBottom:
                                                    "1px solid #e5e7eb",
                                            }}
                                        >
                                            {booking.purpose}
                                        </td>

                                        <td
                                            style={{
                                                padding: "12px",
                                                borderBottom:
                                                    "1px solid #e5e7eb",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    ...statusColor(
                                                        booking.status
                                                    ),
                                                    padding: "5px 8px",
                                                    borderRadius: "6px",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {booking.status}
                                            </span>
                                        </td>

                                        <td
                                            style={{
                                                padding: "12px",
                                                borderBottom:
                                                    "1px solid #e5e7eb",
                                            }}
                                        >
                                            {booking.status ===
                                                "Chờ xác nhận" && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        cancelBooking(
                                                            booking.id
                                                        )
                                                    }
                                                    style={{
                                                        border: 0,
                                                        color: "#dc2626",
                                                        background:
                                                            "transparent",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    Hủy
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            </div>
        </div>
    );
}

export default StudyRoomBooking;
