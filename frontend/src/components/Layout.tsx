
import { NavLink, Outlet, useNavigate } from "react-router-dom";

function Layout() {
  const navigate = useNavigate();

  
const menuItems = [
  { name: "Dashboard", path: "/dashboard", icon: "📊" },
  { name: "Rooms", path: "/rooms", icon: "🏢" },
  { name: "Room Schedule", path: "/roomschedule", icon: "📅" },
  { name: "Room Booking", path: "/room-booking", icon: "📝" },
  { name: "Study Room Booking", path: "/study-room-booking", icon: "📚" },
  { name: "Seat Picker", path: "/seat-picker", icon: "💺" },
];


  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <aside
        style={{
          width: "240px",
          minWidth: "240px",
          backgroundColor: "#111827",
          color: "white",
          padding: "24px 16px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: "21px",
            fontWeight: "bold",
            padding: "8px 10px",
          }}
        >
          Smart Campus
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#9ca3af",
            padding: "0 10px",
            marginBottom: "30px",
          }}
        >
          Facility & Study Room
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                borderRadius: "8px",
                textDecoration: "none",
                color: isActive ? "#ffffff" : "#d1d5db",
                backgroundColor: isActive ? "#2563eb" : "transparent",
                fontSize: "14px",
              })}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => navigate("/login")}
          style={{
            marginTop: "24px",
            padding: "12px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#374151",
            color: "#ffffff",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          ↪ Đăng xuất
        </button>
      </aside>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            height: "70px",
            minHeight: "70px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#111827",
            }}
          >
            Smart Campus Facility & Study Room
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
              }}
            >
              A
            </div>
            <span style={{ fontSize: "14px", color: "#374151" }}>
              Admin
            </span>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            padding: "24px",
            boxSizing: "border-box",
            overflowX: "auto",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
