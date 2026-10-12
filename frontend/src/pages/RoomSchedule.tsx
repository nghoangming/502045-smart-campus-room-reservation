import { useState } from "react";

function RoomSchedule() {
    const [room, setRoom] = useState("All Rooms");
    const [date, setDate] = useState("2026-10-07");

    const schedules = [
        {
            room: "A101",
            subject: "Database Systems",
            lecturer: "Nguyen Van A",
            time: "08:00 - 10:00",
            status: "Occupied",
        },
        {
            room: "A102",
            subject: "Web Programming",
            lecturer: "Tran Thi B",
            time: "08:00 - 10:00",
            status: "Occupied",
        },
        {
            room: "B201",
            subject: "Software Engineering",
            lecturer: "Le Van C",
            time: "10:00 - 12:00",
            status: "Occupied",
        },
        {
            room: "B202",
            subject: "Data Structures",
            lecturer: "Pham Van D",
            time: "13:00 - 15:00",
            status: "Occupied",
        },
        {
            room: "C301",
            subject: "Computer Networks",
            lecturer: "Nguyen Thi E",
            time: "13:00 - 15:00",
            status: "Occupied",
        },
        {
            room: "C302",
            subject: "No class",
            lecturer: "-",
            time: "15:00 - 17:00",
            status: "Available",
        },
    ];

    const filteredSchedules =
        room === "All Rooms"
            ? schedules
            : schedules.filter((item) => item.room === room);

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#f5f7fb",
                padding: "30px",
                boxSizing: "border-box",
                fontFamily: "Arial",
            }}
        >
            <h1
                style={{
                    margin: "0 0 8px",
                    color: "#111827",
                }}
            >
                Room Schedule
            </h1>

            <p
                style={{
                    marginBottom: "30px",
                    color: "#6b7280",
                }}
            >
                View room schedules and availability
            </p>

            {/* Filter */}
            <div
                style={{
                    backgroundColor: "white",
                    padding: "20px",
                    borderRadius: "10px",
                    marginBottom: "20px",
                    display: "flex",
                    gap: "20px",
                    alignItems: "center",
                }}
            >
                <div>
                    <label
                        style={{
                            display: "block",
                            marginBottom: "6px",
                            fontWeight: "bold",
                        }}
                    >
                        Date
                    </label>

                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{
                            padding: "9px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                        }}
                    />
                </div>

                <div>
                    <label
                        style={{
                            display: "block",
                            marginBottom: "6px",
                            fontWeight: "bold",
                        }}
                    >
                        Room
                    </label>

                    <select
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                        style={{
                            padding: "10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            minWidth: "160px",
                        }}
                    >
                        <option value="All Rooms">
                            All Rooms
                        </option>
                        <option value="A101">A101</option>
                        <option value="A102">A102</option>
                        <option value="B201">B201</option>
                        <option value="B202">B202</option>
                        <option value="C301">C301</option>
                        <option value="C302">C302</option>
                    </select>
                </div>

                <button
                    type="button"
                    style={{
                        marginTop: "23px",
                        padding: "10px 18px",
                        border: "none",
                        borderRadius: "6px",
                        backgroundColor: "#2563eb",
                        color: "white",
                        cursor: "pointer",
                    }}
                >
                    + Add Schedule
                </button>
            </div>

            <div
                style={{
                    backgroundColor: "white",
                    padding: "20px",
                    borderRadius: "10px",
                }}
            >
                <h2
                    style={{
                        marginTop: 0,
                        color: "#111827",
                    }}
                >
                    Schedule: {date}
                </h2>

                <div
                    style={{
                        overflowX: "auto",
                    }}
                >
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            minWidth: "700px",
                        }}
                    >
                        <thead>
                            <tr
                                style={{
                                    backgroundColor: "#f9fafb",
                                }}
                            >
                                <th style={thStyle}>Room</th>
                                <th style={thStyle}>Subject</th>
                                <th style={thStyle}>Lecturer</th>
                                <th style={thStyle}>Time</th>
                                <th style={thStyle}>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredSchedules.map((item) => (
                                <tr key={item.room}>
                                    <td style={tdStyle}>
                                        <strong>{item.room}</strong>
                                    </td>

                                    <td style={tdStyle}>
                                        {item.subject}
                                    </td>

                                    <td style={tdStyle}>
                                        {item.lecturer}
                                    </td>

                                    <td style={tdStyle}>
                                        {item.time}
                                    </td>

                                    <td style={tdStyle}>
                                        <span
                                            style={{
                                                padding: "5px 10px",
                                                borderRadius: "5px",
                                                backgroundColor:
                                                    item.status ===
                                                    "Available"
                                                        ? "#dcfce7"
                                                        : "#dbeafe",
                                                color:
                                                    item.status ===
                                                    "Available"
                                                        ? "#15803d"
                                                        : "#2563eb",
                                            }}
                                        >
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const thStyle = {
    textAlign: "left" as const,
    padding: "14px",
    borderBottom: "1px solid #e5e7eb",
    color: "#374151",
};

const tdStyle = {
    padding: "14px",
    borderBottom: "1px solid #e5e7eb",
    color: "#4b5563",
};

export default RoomSchedule;
