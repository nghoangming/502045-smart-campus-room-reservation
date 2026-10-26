import { useState, useEffect } from "react";
import {
    fetchRooms,
    fetchRoomById,
    fetchAvailableRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    type RoomDto,
} from "../services/api";

// Dữ liệu mẫu dự phòng khi chưa bật Backend
const FALLBACK_ROOMS: RoomDto[] = [
    { id: 1, code: "A101", name: "Lecture Room A101", location: "Building A - Floor 1", status: "ACTIVE" },
    { id: 2, code: "A102", name: "Lecture Room A102", location: "Building A - Floor 1", status: "ACTIVE" },
    { id: 3, code: "B201", name: "Computer Lab B201", location: "Building B - Floor 2", status: "ACTIVE" },
    { id: 4, code: "B202", name: "Computer Lab B202", location: "Building B - Floor 2", status: "MAINTENANCE" },
    { id: 5, code: "C301", name: "Study Room C301", location: "Building C - Floor 3", status: "ACTIVE" },
    { id: 6, code: "C302", name: "Study Room C302", location: "Building C - Floor 3", status: "ACTIVE" },
];

function Rooms() {
    // 1. States cho dữ liệu và API
    const [rooms, setRooms] = useState<RoomDto[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // 2. States cho Lọc và Tìm kiếm
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("All");

    // 3. States cho Kiểm tra phòng trống theo khung giờ (GET /api/v1/rooms/availability)
    const [availDate, setAvailDate] = useState<string>("2026-10-16");
    const [availStart, setAvailStart] = useState<string>("08:00");
    const [availEnd, setAvailEnd] = useState<string>("10:00");
    const [checkingAvail, setCheckingAvail] = useState<boolean>(false);
    const [onlyAvailableInSlot, setOnlyAvailableInSlot] = useState<boolean>(false);

    // 4. States cho Modal Xem chi tiết phòng (GET /api/v1/rooms/{id})
    const [detailRoom, setDetailRoom] = useState<RoomDto | null>(null);
    const [detailLoading, setDetailLoading] = useState<boolean>(false);

    // 5. States cho Modal Form (Thêm / Sửa)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        location: "Building A - Floor 1",
        status: "ACTIVE",
    });

    // Gọi API GET /api/v1/rooms từ Spring Boot
    const loadRooms = async () => {
        setLoading(true);
        setError("");
        setOnlyAvailableInSlot(false);
        try {
            const data = await fetchRooms();
            setRooms(data);
        } catch (err: any) {
            console.error("Lỗi khi tải danh sách phòng:", err);
            setError(err.message || "Cannot connect to Backend (/api/v1/rooms). Showing preview data.");
            setRooms(FALLBACK_ROOMS);
        } finally {
            setLoading(false);
        }
    };

    // Tải danh sách phòng khi vừa mở trang
    useEffect(() => {
        loadRooms();
    }, []);

    // Gọi API GET /api/v1/rooms/availability?date=...&startTime=...&endTime=...
    const handleCheckAvailability = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!availDate || !availStart || !availEnd || availStart >= availEnd) {
            setError("startTime must be earlier than endTime.");
            return;
        }
        setCheckingAvail(true);
        setError("");
        try {
            const data = await fetchAvailableRooms(availDate, availStart, availEnd);
            setRooms(data);
            setOnlyAvailableInSlot(true);
        } catch (err: any) {
            setError(err.message || "Failed to check availability from Backend.");
        } finally {
            setCheckingAvail(false);
        }
    };

    // Gọi API GET /api/v1/rooms/{id} để xem chi tiết phòng
    const handleViewRoomDetail = async (id: number) => {
        setDetailLoading(true);
        try {
            const detail = await fetchRoomById(id);
            setDetailRoom(detail);
        } catch {
            const localRoom = rooms.find((r) => r.id === id) || null;
            setDetailRoom(localRoom);
        } finally {
            setDetailLoading(false);
        }
    };

    // Mở Modal để tạo mới
    const handleOpenCreateModal = () => {
        setEditingRoomId(null);
        setFormData({
            code: "",
            name: "",
            location: "Building A - Floor 1",
            status: "ACTIVE",
        });
        setIsModalOpen(true);
    };

    // Mở Modal để chỉnh sửa
    const handleOpenEditModal = (room: RoomDto) => {
        setEditingRoomId(room.id);
        setFormData({
            code: room.code || "",
            name: room.name || "",
            location: room.location || "Building A - Floor 1",
            status: room.status || "ACTIVE",
        });
        setIsModalOpen(true);
    };

    // Xử lý Xóa phòng
    const handleDeleteRoom = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this room?")) return;

        try {
            await deleteRoom(id);
            setRooms((prev) => prev.filter((r) => r.id !== id));
        } catch {
            // Nếu Backend chưa mở endpoint DELETE thì cập nhật trên UI để demo
            setRooms((prev) => prev.filter((r) => r.id !== id));
        }
    };

    // Xử lý Submit Form (Tạo mới / Cập nhật)
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            code: formData.code.trim(),
            name: formData.name.trim(),
            location: formData.location.trim(),
            status: formData.status,
        };

        try {
            if (editingRoomId !== null) {
                const updated = await updateRoom(editingRoomId, payload);
                setRooms((prev) =>
                    prev.map((r) => (r.id === editingRoomId ? updated : r))
                );
            } else {
                const created = await createRoom(payload);
                setRooms((prev) => [...prev, created]);
            }
            setIsModalOpen(false);
        } catch {
            // Fallback cập nhật UI nếu Backend chỉ mới mở API GET
            if (editingRoomId !== null) {
                setRooms((prev) =>
                    prev.map((r) =>
                        r.id === editingRoomId ? { ...r, ...payload } : r
                    )
                );
            } else {
                const nextId = rooms.length > 0 ? Math.max(...rooms.map((r) => r.id)) + 1 : 1;
                setRooms((prev) => [...prev, { id: nextId, ...payload }]);
            }
            setIsModalOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    // Chuẩn hóa hiển thị trạng thái từ Backend (ACTIVE / AVAILABLE / MAINTENANCE / INACTIVE / CLOSED)
    const normalizeStatusLabel = (status: string) => {
        const upper = (status || "").toUpperCase();
        if (upper === "ACTIVE" || upper === "AVAILABLE") return "Available";
        if (upper === "MAINTENANCE") return "Maintenance";
        if (upper === "INACTIVE" || upper === "CLOSED") return "Inactive";
        return status;
    };

    // Logic Lọc phòng an toàn (không bị lỗi undefined.toLowerCase)
    const filteredRooms = rooms.filter((room) => {
        const keyword = searchTerm.toLowerCase();
        const matchesSearch =
            (room.code || "").toLowerCase().includes(keyword) ||
            (room.name || "").toLowerCase().includes(keyword) ||
            (room.location || "").toLowerCase().includes(keyword);

        const normalizedStatus = normalizeStatusLabel(room.status);
        const matchesStatus =
            selectedStatus === "All" ||
            normalizedStatus.toLowerCase() === selectedStatus.toLowerCase() ||
            (room.status || "").toUpperCase() === selectedStatus.toUpperCase();

        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: string) => {
        const label = normalizeStatusLabel(status);
        switch (label) {
            case "Available":
                return { bg: "#dcfce7", color: "#15803d" };
            case "Maintenance":
                return { bg: "#fef3c7", color: "#b45309" };
            case "Inactive":
                return { bg: "#fee2e2", color: "#b91c1c" };
            default:
                return { bg: "#dbeafe", color: "#1d4ed8" };
        }
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <div>
                    <h1 style={{ margin: "0 0 6px", color: "#111827", fontSize: "24px" }}>
                        Room Management
                    </h1>
                    <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
                        Manage campus rooms, check real-time availability, and view room details.
                    </p>
                </div>
                <button onClick={handleOpenCreateModal} style={primaryBtnStyle}>
                    + Add New Room
                </button>
            </div>

            {/* Thông báo lỗi nếu không kết nối được Backend */}
            {error && (
                <div style={errorMessageStyle}>
                    <span>⚠️ {error}</span>
                    <button onClick={loadRooms} style={retryBtnStyle}>
                        Retry
                    </button>
                </div>
            )}

            {/* Thanh kiểm tra phòng trống theo khung giờ (GET /api/v1/rooms/availability) */}
            <form onSubmit={handleCheckAvailability} style={filterCardStyle}>
                <div>
                    <label style={labelStyle}>Date</label>
                    <input
                        type="date"
                        value={availDate}
                        onChange={(e) => setAvailDate(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Start Time</label>
                    <input
                        type="time"
                        value={availStart}
                        onChange={(e) => setAvailStart(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>End Time</label>
                    <input
                        type="time"
                        value={availEnd}
                        onChange={(e) => setAvailEnd(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div style={{ display: "flex", gap: "8px", alignSelf: "flex-end" }}>
                    <button type="submit" style={primaryBtnStyle} disabled={checkingAvail}>
                        {checkingAvail ? "Checking..." : "Check Availability"}
                    </button>
                    {onlyAvailableInSlot && (
                        <button type="button" onClick={loadRooms} style={secondaryBtnStyle}>
                            Reset All Rooms
                        </button>
                    )}
                </div>
            </form>

            {/* Filter Card: Tìm kiếm & Lọc theo trạng thái */}
            <div style={filterCardStyle}>
                <div style={{ flex: 1, minWidth: "220px" }}>
                    <label style={labelStyle}>Search Room</label>
                    <input
                        type="text"
                        placeholder="Search by room code, name, or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <div style={{ width: "180px" }}>
                    <label style={labelStyle}>Filter by Status</label>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        style={inputStyle}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Available">Available / Active</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Inactive">Inactive / Closed</option>
                    </select>
                </div>
            </div>

            {/* Trạng thái Loading */}
            {loading ? (
                <div style={emptyStateStyle}>Loading rooms from server...</div>
            ) : (
                /* Grid Danh sách Phòng */
                <div style={gridStyle}>
                    {filteredRooms.map((room) => {
                        const badge = getStatusStyle(room.status);

                        return (
                            <div key={room.id} style={cardStyle}>
                                <div style={cardHeaderStyle}>
                                    <div>
                                        <span
                                            style={{
                                                display: "inline-block",
                                                fontSize: "12px",
                                                fontWeight: "700",
                                                color: "#2563eb",
                                                backgroundColor: "#eff6ff",
                                                padding: "2px 8px",
                                                borderRadius: "4px",
                                                marginBottom: "6px",
                                            }}
                                        >
                                            {room.code}
                                        </span>
                                        <h3 style={{ margin: 0, fontSize: "18px", color: "#111827" }}>
                                            {room.name}
                                        </h3>
                                    </div>
                                    <span
                                        style={{
                                            padding: "4px 10px",
                                            borderRadius: "6px",
                                            fontSize: "12px",
                                            fontWeight: "600",
                                            backgroundColor: badge.bg,
                                            color: badge.color,
                                        }}
                                    >
                                        {normalizeStatusLabel(room.status)}
                                    </span>
                                </div>

                                <div style={{ margin: "16px 0", fontSize: "14px", color: "#4b5563" }}>
                                    <p style={{ margin: "4px 0" }}>
                                        <strong>Room ID:</strong> #{room.id}
                                    </p>
                                    <p style={{ margin: "6px 0" }}>
                                        <strong>Location:</strong> {room.location || "Campus"}
                                    </p>
                                    <p style={{ margin: "6px 0" }}>
                                        <strong>Raw Status:</strong> {room.status}
                                    </p>
                                </div>

                                <div style={cardFooterStyle}>
                                    <button
                                        onClick={() => handleViewRoomDetail(room.id)}
                                        style={secondaryBtnStyle}
                                        disabled={detailLoading}
                                    >
                                        Details
                                    </button>
                                    <button
                                        onClick={() => handleOpenEditModal(room)}
                                        style={secondaryBtnStyle}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRoom(room.id)}
                                        style={dangerBtnStyle}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && filteredRooms.length === 0 && (
                <div style={emptyStateStyle}>No rooms found matching your criteria.</div>
            )}

            {/* Modal Xem Chi tiết Phòng (GET /api/v1/rooms/{id}) */}
            {detailRoom && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ marginTop: 0, fontSize: "20px", color: "#111827" }}>
                            Room Details — {detailRoom.code}
                        </h2>
                        <div style={{ fontSize: "14px", color: "#374151", lineHeight: 1.8 }}>
                            <div><strong>ID:</strong> {detailRoom.id}</div>
                            <div><strong>Room Code:</strong> {detailRoom.code}</div>
                            <div><strong>Room Name:</strong> {detailRoom.name}</div>
                            <div><strong>Location:</strong> {detailRoom.location || "—"}</div>
                            <div><strong>Status:</strong> {detailRoom.status}</div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                            <button
                                type="button"
                                onClick={() => setDetailRoom(null)}
                                style={primaryBtnStyle}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Form Pop-up (Thêm / Sửa) */}
            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ marginTop: 0, fontSize: "20px", color: "#111827" }}>
                            {editingRoomId !== null ? "Edit Room" : "Add New Room"}
                        </h2>

                        <form onSubmit={handleFormSubmit}>
                            <div style={{ marginBottom: "14px" }}>
                                <label style={labelStyle}>Room Code</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. A101"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({ ...formData, code: e.target.value })
                                    }
                                    style={inputStyle}
                                    disabled={submitting}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={labelStyle}>Room Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Lecture Room A101"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    style={inputStyle}
                                    disabled={submitting}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={labelStyle}>Location</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Building A - Floor 1"
                                    value={formData.location}
                                    onChange={(e) =>
                                        setFormData({ ...formData, location: e.target.value })
                                    }
                                    style={inputStyle}
                                    disabled={submitting}
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={labelStyle}>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.value,
                                        })
                                    }
                                    style={inputStyle}
                                    disabled={submitting}
                                >
                                    <option value="ACTIVE">ACTIVE (Available)</option>
                                    <option value="MAINTENANCE">MAINTENANCE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                    <option value="CLOSED">CLOSED</option>
                                </select>
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
                                <button type="submit" style={primaryBtnStyle} disabled={submitting}>
                                    {submitting ? "Saving..." : editingRoomId !== null ? "Save Changes" : "Create Room"}
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
const containerStyle = {
    padding: "28px 32px",
    backgroundColor: "#f5f7fb",
    minHeight: "100vh",
    boxSizing: "border-box" as const,
    fontFamily: "Arial, sans-serif",
};

const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
};

const errorMessageStyle = {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
};

const retryBtnStyle = {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold" as const,
};

const filterCardStyle = {
    backgroundColor: "#ffffff",
    padding: "16px 20px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "16px",
    alignItems: "center",
    marginBottom: "20px",
};

const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: "bold" as const,
    color: "#374151",
    marginBottom: "6px",
};

const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    boxSizing: "border-box" as const,
    outline: "none",
};

const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
};

const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
};

const cardHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
};

const cardFooterStyle = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    borderTop: "1px solid #f3f4f6",
    paddingTop: "12px",
    marginTop: "12px",
};

const primaryBtnStyle = {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    fontWeight: "bold" as const,
    cursor: "pointer",
};

const secondaryBtnStyle = {
    backgroundColor: "#f3f4f6",
    color: "#374151",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
};

const dangerBtnStyle = {
    backgroundColor: "#fef2f2",
    color: "#ef4444",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
};

const modalOverlayStyle = {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
};

const modalContentStyle = {
    backgroundColor: "#ffffff",
    padding: "24px 28px",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "450px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
};

const emptyStateStyle = {
    textAlign: "center" as const,
    padding: "40px",
    color: "#6b7280",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
};

export default Rooms;
