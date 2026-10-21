import { useState, useEffect } from "react";
import {
    fetchRooms,
    createRoom,
    updateRoom,
    deleteRoom,
} from "../services/api";

export interface Room {
    id: string;
    name: string;
    building: string;
    capacity: number;
    status: "Available" | "Occupied" | "Maintenance";
    equipment: string[];
}

function Rooms() {
    // 1. States cho dữ liệu và API
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // 2. States cho Lọc và Tìm kiếm
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("All");

    // 3. States cho Modal Form (Pop-up)
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [formData, setFormData] = useState({
        name: "",
        building: "Building A",
        capacity: 30,
        status: "Available" as Room["status"],
        equipmentText: "",
    });

    // Hàm gọi API lấy danh sách phòng từ Spring Boot
    const loadRooms = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchRooms();
            setRooms(data);
        } catch (err) {
            console.error("Lỗi khi tải danh sách phòng:", err);
            setError("Cannot connect to server. Please check your Backend.");
        } finally {
            setLoading(false);
        }
    };

    // Tải danh sách phòng khi vừa mở trang
    useEffect(() => {
        loadRooms();
    }, []);

    // Mở Modal để tạo mới
    const handleOpenCreateModal = () => {
        setEditingRoomId(null);
        setFormData({
            name: "",
            building: "Building A",
            capacity: 30,
            status: "Available",
            equipmentText: "Projector, AirCon",
        });
        setIsModalOpen(true);
    };

    // Mở Modal để chỉnh sửa
    const handleOpenEditModal = (room: Room) => {
        setEditingRoomId(room.id);
        setFormData({
            name: room.name,
            building: room.building,
            capacity: room.capacity,
            status: room.status,
            equipmentText: room.equipment ? room.equipment.join(", ") : "",
        });
        setIsModalOpen(true);
    };

    // Xử lý Xóa phòng qua API
    const handleDeleteRoom = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this room?")) return;

        try {
            await deleteRoom(id);
            setRooms((prev) => prev.filter((r) => r.id !== id));
        } catch (err) {
            alert("Failed to delete room. Please try again.");
        }
    };

    // Xử lý Submit Form (Tạo mới / Cập nhật qua API)
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const equipmentList = formData.equipmentText
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0);

        const payload = {
            name: formData.name,
            building: formData.building,
            capacity: Number(formData.capacity),
            status: formData.status,
            equipment: equipmentList,
        };

        try {
            if (editingRoomId) {
                // Gọi API PUT cập nhật
                const updated = await updateRoom(editingRoomId, payload);
                setRooms((prev) =>
                    prev.map((r) => (r.id === editingRoomId ? updated : r))
                );
            } else {
                // Gọi API POST thêm mới
                const created = await createRoom(payload);
                setRooms((prev) => [...prev, created]);
            }
            setIsModalOpen(false);
        } catch (err) {
            alert("Failed to save room details. Please check your Backend connection.");
        } finally {
            setSubmitting(false);
        }
    };

    // Logic Lọc phòng
    const filteredRooms = rooms.filter((room) => {
        const matchesSearch =
            room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            room.building.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            selectedStatus === "All" || room.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: Room["status"]) => {
        switch (status) {
            case "Available":
                return { bg: "#dcfce7", color: "#15803d" };
            case "Occupied":
                return { bg: "#dbeafe", color: "#1d4ed8" };
            case "Maintenance":
                return { bg: "#fef3c7", color: "#b45309" };
            default:
                return { bg: "#f3f4f6", color: "#374151" };
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
                        Manage campus study rooms, capacities, and facilities.
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

            {/* Filter Card */}
            <div style={filterCardStyle}>
                <div style={{ flex: 1, minWidth: "220px" }}>
                    <label style={labelStyle}>Search Room</label>
                    <input
                        type="text"
                        placeholder="Search by room name or building..."
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
                        <option value="Available">Available</option>
                        <option value="Occupied">Occupied</option>
                        <option value="Maintenance">Maintenance</option>
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
                                        <h3 style={{ margin: 0, fontSize: "18px", color: "#111827" }}>
                                            {room.name}
                                        </h3>
                                        <span style={{ fontSize: "12px", color: "#6b7280" }}>
                                            {room.building}
                                        </span>
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
                                        {room.status}
                                    </span>
                                </div>

                                <div style={{ margin: "16px 0", fontSize: "14px", color: "#4b5563" }}>
                                    <p style={{ margin: "4px 0" }}>
                                        <strong>Capacity:</strong> {room.capacity} seats
                                    </p>
                                    <div style={{ marginTop: "10px" }}>
                                        <strong style={{ fontSize: "12px", color: "#6b7280" }}>
                                            EQUIPMENT:
                                        </strong>
                                        <div style={tagContainerStyle}>
                                            {room.equipment && room.equipment.length > 0 ? (
                                                room.equipment.map((item, idx) => (
                                                    <span key={idx} style={tagStyle}>
                                                        {item}
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                                                    None
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div style={cardFooterStyle}>
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

            {!loading && filteredRooms.length === 0 && !error && (
                <div style={emptyStateStyle}>No rooms found matching your criteria.</div>
            )}

            {/* Modal Form Pop-up */}
            {isModalOpen && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ marginTop: 0, fontSize: "20px", color: "#111827" }}>
                            {editingRoomId ? "Edit Room" : "Add New Room"}
                        </h2>

                        <form onSubmit={handleFormSubmit}>
                            <div style={{ marginBottom: "14px" }}>
                                <label style={labelStyle}>Room Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. A101"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    style={inputStyle}
                                    disabled={submitting}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={labelStyle}>Building</label>
                                <select
                                    value={formData.building}
                                    onChange={(e) =>
                                        setFormData({ ...formData, building: e.target.value })
                                    }
                                    style={inputStyle}
                                    disabled={submitting}
                                >
                                    <option value="Building A">Building A</option>
                                    <option value="Building B">Building B</option>
                                    <option value="Building C">Building C</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={labelStyle}>Capacity (seats)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.capacity}
                                    onChange={(e) =>
                                        setFormData({ ...formData, capacity: Number(e.target.value) })
                                    }
                                    style={inputStyle}
                                    disabled={submitting}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={labelStyle}>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.value as Room["status"],
                                        })
                                    }
                                    style={inputStyle}
                                    disabled={submitting}
                                >
                                    <option value="Available">Available</option>
                                    <option value="Occupied">Occupied</option>
                                    <option value="Maintenance">Maintenance</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={labelStyle}>Equipment (separated by comma)</label>
                                <input
                                    type="text"
                                    placeholder="Projector, AirCon, Whiteboard"
                                    value={formData.equipmentText}
                                    onChange={(e) =>
                                        setFormData({ ...formData, equipmentText: e.target.value })
                                    }
                                    style={inputStyle}
                                    disabled={submitting}
                                />
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
                                    {submitting ? "Saving..." : editingRoomId ? "Save Changes" : "Create Room"}
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
    gap: "16px",
    alignItems: "center",
    marginBottom: "24px",
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

const tagContainerStyle = {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
    marginTop: "6px",
};

const tagStyle = {
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "4px",
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