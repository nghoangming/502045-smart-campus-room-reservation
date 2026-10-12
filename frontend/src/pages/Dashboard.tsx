import { useState } from "react";

function Dashboard() {
    const [activeMenu, setActiveMenu] = useState("Dashboard");

    const menuItems = [
        "Dashboard",
        "Room Schedule",
        "Rooms",
        "Bookings",
        "Users",
    ];

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                backgroundColor: "#f5f7fb",
                fontFamily: "Arial, sans-serif",
            }}
        >
            {/* Sidebar */}
            <aside
                style={{
                    width: "240px",
                    minHeight: "100vh",
                    backgroundColor: "#ffffff",
                    borderRight: "1px solid #e5e7eb",
                    padding: "24px 16px",
                    boxSizing: "border-box",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "40px",
                        padding: "0 8px",
                    }}
                >
                    <div
                        style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "10px",
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            fontSize: "12px",
                        }}
                    >
                        SC
                    </div>

                    <div>
                        <div
                            style={{
                                fontSize: "17px",
                                fontWeight: "700",
                                color: "#111827",
                            }}
                        >
                            Smart Campus
                        </div>

                        <div
                            style={{
                                fontSize: "12px",
                                color: "#6b7280",
                            }}
                        >
                            Facility Management
                        </div>
                    </div>
                </div>

                <div>
                    {menuItems.map((item) => (
                        <div
                            key={item}
                            onClick={() => setActiveMenu(item)}
                            style={{
                                padding: "12px 14px",
                                marginBottom: "6px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                backgroundColor:
                                    activeMenu === item
                                        ? "#eff6ff"
                                        : "transparent",
                                color:
                                    activeMenu === item
                                        ? "#2563eb"
                                        : "#4b5563",
                                fontWeight:
                                    activeMenu === item ? "600" : "400",
                            }}
                        >
                            {item}
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        marginTop: "auto",
                        paddingTop: "40px",
                    }}
                >
                    <div
                        style={{
                            padding: "12px 14px",
                            color: "#ef4444",
                            cursor: "pointer",
                        }}
                    >
                        Logout
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main
                style={{
                    flex: 1,
                    padding: "28px 32px",
                    boxSizing: "border-box",
                }}
            >
                {/* Header */}
                <header
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "30px",
                    }}
                >
                    <div>
                        <h1
                            style={{
                                margin: "0 0 6px",
                                fontSize: "28px",
                                color: "#111827",
                            }}
                        >
                            Dashboard
                        </h1>

                        <p
                            style={{
                                margin: 0,
                                color: "#6b7280",
                            }}
                        >
                            Welcome back! Here's what's happening today.
                        </p>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                        }}
                    >
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                backgroundColor: "#dbeafe",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#2563eb",
                                fontWeight: "700",
                            }}
                        >
                            TN
                        </div>

                        <div>
                            <div
                                style={{
                                    fontWeight: "600",
                                    color: "#111827",
                                }}
                            >
                                Trí Nguyên
                            </div>

                            <div
                                style={{
                                    fontSize: "12px",
                                    color: "#6b7280",
                                }}
                            >
                                Administrator
                            </div>
                        </div>
                    </div>
                </header>

                {/* Statistics */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(4, minmax(0, 1fr))",
                        gap: "20px",
                        marginBottom: "28px",
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            padding: "22px",
                            borderRadius: "12px",
                            border: "1px solid #e5e7eb",
                        }}
                    >
                        <div
                            style={{
                                color: "#6b7280",
                                fontSize: "14px",
                            }}
                        >
                            Total Rooms
                        </div>

                        <div
                            style={{
                                fontSize: "30px",
                                fontWeight: "700",
                                marginTop: "8px",
                                color: "#111827",
                            }}
                        >
                            48
                        </div>

                        <div
                            style={{
                                marginTop: "8px",
                                fontSize: "13px",
                                color: "#16a34a",
                            }}
                        >
                            +4 this month
                        </div>
                    </div>

                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            padding: "22px",
                            borderRadius: "12px",
                            border: "1px solid #e5e7eb",
                        }}
                    >
                        <div
                            style={{
                                color: "#6b7280",
                                fontSize: "14px",
                            }}
                        >
                            Available Rooms
                        </div>

                        <div
                            style={{
                                fontSize: "30px",
                                fontWeight: "700",
                                marginTop: "8px",
                                color: "#111827",
                            }}
                        >
                            21
                        </div>

                        <div
                            style={{
                                marginTop: "8px",
                                fontSize: "13px",
                                color: "#16a34a",
                            }}
                        >
                            43.75% available
                        </div>
                    </div>

                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            padding: "22px",
                            borderRadius: "12px",
                            border: "1px solid #e5e7eb",
                        }}
                    >
                        <div
                            style={{
                                color: "#6b7280",
                                fontSize: "14px",
                            }}
                        >
                            Today's Bookings
                        </div>

                        <div
                            style={{
                                fontSize: "30px",
                                fontWeight: "700",
                                marginTop: "8px",
                                color: "#111827",
                            }}
                        >
                            32
                        </div>

                        <div
                            style={{
                                marginTop: "8px",
                                fontSize: "13px",
                                color: "#2563eb",
                            }}
                        >
                            8 upcoming
                        </div>
                    </div>

                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            padding: "22px",
                            borderRadius: "12px",
                            border: "1px solid #e5e7eb",
                        }}
                    >
                        <div
                            style={{
                                color: "#6b7280",
                                fontSize: "14px",
                            }}
                        >
                            Occupancy Rate
                        </div>

                        <div
                            style={{
                                fontSize: "30px",
                                fontWeight: "700",
                                marginTop: "8px",
                                color: "#111827",
                            }}
                        >
                            67%
                        </div>

                        <div
                            style={{
                                marginTop: "8px",
                                fontSize: "13px",
                                color: "#f59e0b",
                            }}
                        >
                            +5.2% from yesterday
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr",
                        gap: "20px",
                    }}
                >
                    {/* Today's Schedule */}
                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            borderRadius: "12px",
                            border: "1px solid #e5e7eb",
                            padding: "24px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "20px",
                            }}
                        >
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: "19px",
                                    color: "#111827",
                                }}
                            >
                                Today's Schedule
                            </h2>

                            <button
                                style={{
                                    border: "none",
                                    backgroundColor: "#eff6ff",
                                    color: "#2563eb",
                                    padding: "8px 14px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                }}
                            >
                                View All
                            </button>
                        </div>

                        {[
                            {
                                room: "Room A101",
                                time: "08:00 - 10:00",
                                subject: "Database Systems",
                                status: "In Progress",
                            },
                            {
                                room: "Room B202",
                                time: "10:00 - 12:00",
                                subject: "Web Programming",
                                status: "Upcoming",
                            },
                            {
                                room: "Room C305",
                                time: "13:00 - 15:00",
                                subject: "Software Engineering",
                                status: "Upcoming",
                            },
                            {
                                room: "Room A203",
                                time: "15:00 - 17:00",
                                subject: "Data Structures",
                                status: "Upcoming",
                            },
                        ].map((schedule) => (
                            <div
                                key={schedule.room}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "16px 0",
                                    borderBottom:
                                        "1px solid #f1f5f9",
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontWeight: "600",
                                            color: "#111827",
                                        }}
                                    >
                                        {schedule.room}
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "13px",
                                            color: "#6b7280",
                                            marginTop: "5px",
                                        }}
                                    >
                                        {schedule.subject}
                                    </div>
                                </div>

                                <div
                                    style={{
                                        textAlign: "right",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "13px",
                                            color: "#374151",
                                        }}
                                    >
                                        {schedule.time}
                                    </div>

                                    <div
                                        style={{
                                            display: "inline-block",
                                            marginTop: "5px",
                                            padding: "4px 8px",
                                            borderRadius: "5px",
                                            backgroundColor:
                                                schedule.status ===
                                                "In Progress"
                                                    ? "#dcfce7"
                                                    : "#eff6ff",
                                            color:
                                                schedule.status ===
                                                "In Progress"
                                                    ? "#16a34a"
                                                    : "#2563eb",
                                            fontSize: "11px",
                                        }}
                                    >
                                        {schedule.status}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Room Status */}
                    <div
                        style={{
                            backgroundColor: "#ffffff",
                            borderRadius: "12px",
                            border: "1px solid #e5e7eb",
                            padding: "24px",
                        }}
                    >
                        <h2
                            style={{
                                margin: "0 0 20px",
                                fontSize: "19px",
                                color: "#111827",
                            }}
                        >
                            Room Status
                        </h2>

                        <div
                            style={{
                                marginBottom: "20px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "8px",
                                }}
                            >
                                <span>Available</span>
                                <strong>21</strong>
                            </div>

                            <div
                                style={{
                                    height: "8px",
                                    backgroundColor: "#e5e7eb",
                                    borderRadius: "10px",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        width: "44%",
                                        height: "100%",
                                        backgroundColor: "#22c55e",
                                    }}
                                />
                            </div>
                        </div>

                        <div
                            style={{
                                marginBottom: "20px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "8px",
                                }}
                            >
                                <span>Occupied</span>
                                <strong>23</strong>
                            </div>

                            <div
                                style={{
                                    height: "8px",
                                    backgroundColor: "#e5e7eb",
                                    borderRadius: "10px",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        width: "48%",
                                        height: "100%",
                                        backgroundColor: "#3b82f6",
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "8px",
                                }}
                            >
                                <span>Maintenance</span>
                                <strong>4</strong>
                            </div>

                            <div
                                style={{
                                    height: "8px",
                                    backgroundColor: "#e5e7eb",
                                    borderRadius: "10px",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        width: "8%",
                                        height: "100%",
                                        backgroundColor: "#f59e0b",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
