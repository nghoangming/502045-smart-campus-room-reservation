import { Outlet, useNavigate, useLocation } from "react-router-dom";

function Layout() {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Room Schedule", path: "/roomschedule" },
        { label: "Rooms", path: "/rooms" },
        { label: "Bookings", path: "/bookings" },
        { label: "Users", path: "/users" },
    ];

    return (
        <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f7fb", fontFamily: "Arial, sans-serif" }}>
            {/* SIDEBAR BÊN TRÁI */}
            <aside style={sidebarStyle}>
                <div style={{ padding: "20px 24px", marginBottom: "16px" }}>
                    <h2 style={{ color: "#ffffff", margin: 0, fontSize: "18px", fontWeight: "bold" }}>Smart Campus</h2>
                </div>
                <nav style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "0 12px" }}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                style={{
                                    ...navBtnStyle,
                                    backgroundColor: isActive ? "#2563eb" : "transparent",
                                    color: isActive ? "#ffffff" : "#9ca3af",
                                    fontWeight: isActive ? "600" : "400",
                                }}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* NỘI DUNG TRANG BÊN PHẢI (Outlet sẽ load RoomSchedule / Rooms) */}
            <main style={{ flex: 1, overflowY: "auto" }}>
                <Outlet />
            </main>
        </div>
    );
}

const sidebarStyle = {
    width: "240px",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column" as const,
    flexShrink: 0,
};

const navBtnStyle = {
    padding: "12px 16px",
    border: "none",
    borderRadius: "8px",
    textAlign: "left" as const,
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s",
};

export default Layout;