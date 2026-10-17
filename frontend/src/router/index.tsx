
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import RoomSchedule from "../pages/RoomSchedule";
import RequireLogin from "../components/RequireLogin";

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/dashboard"
                    element={<RequireLogin><Dashboard /></RequireLogin>}
                />

                <Route
                    path="/roomschedule"
                    element={<RequireLogin><RoomSchedule /></RequireLogin>}
                />

                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;
