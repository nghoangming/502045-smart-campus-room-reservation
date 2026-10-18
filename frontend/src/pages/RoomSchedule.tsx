import { useState, useEffect } from "react";
import { fetchSchedules, createSchedule, updateSchedule, deleteSchedule, fetchRooms } from "../services/api";

interface ScheduleItem {
    id?: string;
    room: string;
    subject: string;
    lecturer: string;
    time: string;
    status: "Occupied" | "Available";
}

function RoomSchedule() {
    const [date, setDate] = useState("2026-10-18");
    const [roomFilter, setRoomFilter] = useState("All Rooms");

    // States danh sách phòng và lịch trình
    const [roomOptions, setRoomOptions] = useState<string[]>([]);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

    // States xử lý Loading và Error
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // States cho Pop-up Modal (Thêm / Sửa)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        room: "A101",
        subject: "",
        lecturer: "",
        startTime: "08:00",
        endTime: "10:00",
    });

    // 1. Tải danh sách phòng cho dropdown select
    useEffect(() => {
        fetchRooms()
            .then((data) => {
                if (data && data.length > 0) {
                    const names = data.map((r: any) => r.name);
                    setRoomOptions(names);
                    setFormData((prev) => ({ ...prev, room: names[0] || "A101" }));
                }
            })
            .catch(() => {
                setRoomOptions(["A101", "A102", "B201", "B202", "C301", "C302"]);
            });
    }, []);

    // 2. Tải danh sách lịch phòng
    const loadSchedules = async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await fetchSchedules(date, roomFilter);
            setSchedules(data);
        } catch (err: any) {
            console.error("Failed to load schedules:", err);
            setError(err.message || "Failed to fetch schedules. Please check your Backend connection.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchedules();
    }, [date, roomFilter]);

    // Mở Modal Thêm hoặc Sửa
    const handleOpenModal = (item?: ScheduleItem) => {
        setModalError(null);
        if (item) {
            setEditingItem(item);
            const times = item.time.split(" - ");
            setFormData({
                room: item.room,
                subject: item.subject,
                lecturer: item.lecturer,
                startTime: times[0] || "08:00",
                endTime: times[1] || "10:00",
            });
        } else {
            setEditingItem(null);
            setFormData({
                room: roomOptions[0] || "A101",
                subject: "",
                lecturer: "",
                startTime: "08:00",
                endTime: "10:00",
            });
        }
        setIsModalOpen(true);
    };

    // 3. Thêm mới / Cập nhật lịch trình (POST / PUT API)
    const handleSaveSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setModalError(null);

        const payload = {
            room: formData.room,
            subject: formData.subject,
            lecturer: formData.lecturer,
            time: `${formData.startTime} - ${formData.endTime}`,
            status: "Occupied" as const,
            date: date,
        };

        try {
            if (editingItem && editingItem.id) {
                await updateSchedule(editingItem.id, payload);
            } else {
                await createSchedule(payload);
            }
            setIsModalOpen(false);
            loadSchedules();
        } catch (err: any) {
            setModalError(err.message || "Could not save schedule. Connection error.");
        } finally {
            setSubmitting(false);
        }
    };

    // 4. Xóa lịch trình (DELETE API)
    const handleDeleteSchedule = async (id?: string) => {
        if (!id) return;
        if (!window.confirm("Are you sure you want to delete this schedule?")) return;

        try {
            await deleteSchedule(id);
            loadSchedules();
        } catch (err: any) {
            alert(err.message || "Failed to delete schedule.");
        }
    };

    return (
        <div style={containerStyle}>
            <h1 style={{ margin: "0 0 8px", color: "#111827", fontSize: "24px" }}>
                Room Schedule
            </h1>
            <p style={{ marginBottom: "24px", color: "#6b7280", fontSize: "14px" }}>
                View room schedules and availability across campus.
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
                        disabled={loading}
                    />
                </div>

                <div>
                    <label style={labelStyle}>Room Filter</label>
                    <select
                        value={roomFilter}
                        onChange={(e) => setRoomFilter(e.target.value)}
                        style={{ ...inputStyle, minWidth: "160px" }}
                        disabled={loading}
                    >
                        <option value="All Rooms">All Rooms</option>
                        {roomOptions.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    onClick={() => handleOpenModal()}
                    style={primaryBtnStyle}
                >
                    + Add Schedule
                </button>
            </div>

            {/* BẢNG LỊCH TRÌNH */}
            <div style={tableCardStyle}>
                <h2 style={{ marginTop: 0, color: "#111827", fontSize: "18px", marginBottom: "16px" }}>
                    Schedule for Date: {date}
                </h2>

                {/* TH 1: LOADING */}
                {loading && (
                    <div style={statusContainerStyle}>
                        <div style={spinnerStyle}></div>
                        <p style={{ marginTop: "12px", color: "#6b7280", fontSize: "14px" }}>
                            Loading schedule data...
                        </p>
                    </div>
                )}

                {/* TH 2: ERROR */}
                {!loading && error && (
                    <div style={errorBoxStyle}>
                        <div style={{ fontWeight: "600", fontSize: "15px" }}>⚠️ Connection Error</div>
                        <p style={{ margin: "6px 0 14px", fontSize: "14px" }}>{error}</p>
                        <button onClick={loadSchedules} style={retryBtnStyle}>
                            🔄 Retry
                        </button>
                    </div>
                )}

                {/* TH 3: SUCCESS DATA */}
                {!loading && !error && (
                    <>
                        {schedules.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                                No schedule records found for this criteria.
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "650px" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#f9fafb" }}>
                                            <th style={thStyle}>Room</th>
                                            <th style={thStyle}>Subject / Purpose</th>
                                            <th style={thStyle}>Lecturer / Person</th>
                                            <th style={thStyle}>Time</th>
                                            <th style={thStyle}>Status</th>
                                            <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schedules.map((item, idx) => (
                                            <tr key={item.id || idx}>
                                                <td style={tdStyle}>
                                                    <strong>{item.room}</strong>
                                                </td>
                                                <td style={tdStyle}>{item.subject}</td>
                                                <td style={tdStyle}>{item.lecturer}</td>
                                                <td style={tdStyle}>{item.time}</td>
                                                <td style={tdStyle}>
                                                    <span
                                                        style={{
                                                            padding: "4px 10px",
                                                            borderRadius: "6px",
                                                            backgroundColor:
                                                                item.status === "Available" ? "#dcfce7" : "#dbeafe",
                                                            color:
                                                                item.status === "Available" ? "#15803d" : "#2563eb",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                        }}
                                                    >
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: "right" }}>
                                                    <button
                                                        onClick={() => handleOpenModal(item)}
                                                        style={{ ...actionBtnStyle, color: "#2563eb", marginRight: "8px" }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSchedule(item.id)}
                                                        style={{ ...actionBtnStyle, color: "#dc2626" }}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal Pop-up */}
            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ marginTop: 0, fontSize: "20px", color: "#111827" }}>
                            {editingItem ? "Edit Schedule" : "Add New Schedule"}
                        </h2>

                        {modalError && <div style={modalErrorBoxStyle}>⚠️ {modalError}</div>}

                        <form onSubmit={handleSaveSchedule}>
                            <div style={{ marginBottom: "14px" }}>
                                <label style={labelStyle}>Select Room</label>
                                <select
                                    value={formData.room}
                                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                    style={inputStyle}
                                    disabled={submitting}
                                >
                                    {roomOptions.map((r) => (
                                        <option key={r} value={r}>
                                            {r}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={labelStyle}>Subject / Purpose</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Database Systems"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    style={inputStyle}
                                    disabled={submitting}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={labelStyle}>Lecturer / Organizer</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Dr. Nguyen Van A"
                                    value={formData.lecturer}
                                    onChange={(e) => setFormData({ ...formData, lecturer: e.target.value })}
                                    style={inputStyle}
                                    disabled={submitting}
                                />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                                <div>
                                    <label style={labelStyle}>Start Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        style={inputStyle}
                                        disabled={submitting}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>End Time</label>
                                    <input
                                        type="time"
                                        required
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        style={inputStyle}
                                        disabled={submitting}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    style={secondaryBtnStyle}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        ...primaryBtnStyle,
                                        opacity: submitting ? 0.7 : 1,
                                        cursor: submitting ? "not-allowed" : "pointer",
                                    }}
                                    disabled={submitting}
                                >
                                    {submitting ? "Saving..." : editingItem ? "Save Changes" : "Save Schedule"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline Styles
const containerStyle = { minHeight: "100vh", backgroundColor: "#f5f7fb", padding: "28px 32px", boxSizing: "border-box" as const, fontFamily: "Arial, sans-serif" };
const filterCardStyle = { backgroundColor: "#ffffff", padding: "16px 20px", borderRadius: "12px", marginBottom: "20px", display: "flex", gap: "20px", alignItems: "flex-end", border: "1px solid #e5e7eb" };
const tableCardStyle = { backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" };
const statusContainerStyle = { display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "40px 0" };
const spinnerStyle = { width: "32px", height: "32px", border: "3px solid #e5e7eb", borderTop: "3px solid #2563eb", borderRadius: "50%", animation: "spin 1s linear infinite" };
const errorBoxStyle = { backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "20px", borderRadius: "8px", textAlign: "center" as const };
const modalErrorBoxStyle = { backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" };
const retryBtnStyle = { backgroundColor: "#dc2626", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" as const, fontSize: "13px" };
const labelStyle = { display: "block", marginBottom: "6px", fontWeight: "bold" as const, fontSize: "12px", color: "#374151" };
const inputStyle = { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", width: "100%", boxSizing: "border-box" as const, fontSize: "14px", outline: "none" };
const primaryBtnStyle = { padding: "10px 18px", border: "none", borderRadius: "8px", backgroundColor: "#2563eb", color: "#ffffff", cursor: "pointer", fontWeight: "bold" as const, fontSize: "14px" };
const secondaryBtnStyle = { padding: "8px 14px", border: "none", borderRadius: "6px", backgroundColor: "#f3f4f6", color: "#374151", cursor: "pointer", fontSize: "13px" };
const actionBtnStyle = { background: "none", border: "none", cursor: "pointer", fontWeight: "600" as const, fontSize: "13px" };
const thStyle = { textAlign: "left" as const, padding: "14px", borderBottom: "1px solid #e5e7eb", color: "#374151", fontSize: "14px" };
const tdStyle = { padding: "14px", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontSize: "14px" };
const modalOverlayStyle = { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modalContentStyle = { backgroundColor: "#ffffff", padding: "24px 28px", borderRadius: "16px", width: "100%", maxWidth: "450px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" };

export default RoomSchedule;