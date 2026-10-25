
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import RoomSchedule from "../pages/RoomSchedule";
import Rooms from "../pages/Rooms";
import RoomBooking from "../pages/RoomBooking";
import StudyRoomBooking from "../pages/StudyRoomBooking";
import Layout from "../components/Layout";
import SeatPickerPage from "../pages/SeatPickerPage";


function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
        

                <Route element={<Layout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/rooms" element={<Rooms />} />
                    <Route path="/roomschedule" element={<RoomSchedule />} />
                    <Route path="/room-schedule" element={<RoomSchedule />} />
                    <Route path="/schedule" element={<RoomSchedule />} />

                    <Route path="/study-room-booking" element={<StudyRoomBooking />} />
                    <Route path="/room-booking" element={<RoomBooking />} />
                    <Route path="/seat-picker" element={<SeatPickerPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;
