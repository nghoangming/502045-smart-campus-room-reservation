import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import RoomSchedule from "../pages/RoomSchedule";
import Rooms from "../pages/Rooms";
import Layout from "../components/Layout"; // Import Layout vừa tạo

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Trang Login nằm riêng không có Sidebar */}
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />

                {/* Các trang có chung Sidebar bên trái */}
                <Route element={<Layout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/rooms" element={<Rooms />} />
                    <Route path="/roomschedule" element={<RoomSchedule />} />
                    <Route path="/room-schedule" element={<RoomSchedule />} />
                    <Route path="/schedule" element={<RoomSchedule />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;