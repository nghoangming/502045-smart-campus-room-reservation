import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, campusDate } from "../services/api";
import type { Booking, Room } from "../services/api";

type RoomScheduleData = { room: Room; bookings: Booking[] };

function RoomSchedule() {
    const [roomCode, setRoomCode] = useState("All Rooms");
    const [date, setDate] = useState(campusDate);
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("10:00");
    const [rooms, setRooms] = useState<Room[]>([]);
    const [schedules, setSchedules] = useState<RoomScheduleData[]>([]);
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        setSchedules([]);
        setAvailableRooms([]);
        if (!date || !startTime || !endTime || startTime >= endTime) {
            setError("Please select a date and a start time earlier than the end time.");
            setLoading(false);
            return;
        }
        async function loadRooms() {
            const roomList = await apiRequest<Room[]>("/rooms");
            const query = new URLSearchParams({ date, startTime, endTime });
            const [roomSchedules, available] = await Promise.all([
                Promise.all(roomList.map(async (room) => ({
                    room,
                    bookings: await apiRequest<Booking[]>(`/rooms/${room.id}/schedule?date=${encodeURIComponent(date)}`),
                }))),
                apiRequest<Room[]>(`/rooms/availability?${query}`),
            ]);
            if (!active) return;
            setRooms(roomList);
            setSchedules(roomSchedules);
            setAvailableRooms(available);
        }
        loadRooms().catch((exception: unknown) => {
            if (active) setError(exception instanceof Error ? exception.message : "Unable to load rooms.");
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [date, startTime, endTime]);

    const filteredSchedules = schedules.filter(({ room }) => roomCode === "All Rooms" || room.code === roomCode);
    const filteredAvailable = availableRooms.filter((room) => roomCode === "All Rooms" || room.code === roomCode);
    const formatTime = (value: string) => new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit",
    }).format(new Date(value));

    return (
        <main style={{ minHeight: "100vh", background: "#f5f7fb", padding: 30, fontFamily: "Arial, sans-serif", color: "#17233c" }}>
            <Link to="/dashboard">← Dashboard</Link>
            <h1>Room Schedule</h1>
            <p>View room schedules and availability. All times are Vietnam time (UTC+7).</p>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", background: "white", padding: 20, borderRadius: 10 }}>
                <label>Date<br />
                    <input type="date" value={date} onChange={(event) => setDate(event.target.value)} style={INPUT_STYLE} />
                </label>
                <label>Room<br />
                    <select value={roomCode} onChange={(event) => setRoomCode(event.target.value)} style={INPUT_STYLE}>
                        <option value="All Rooms">All Rooms</option>
                        {rooms.map((room) => <option key={room.id} value={room.code}>{room.code}</option>)}
                    </select>
                </label>
                <label>Start time<br />
                    <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} style={INPUT_STYLE} />
                </label>
                <label>End time<br />
                    <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} style={INPUT_STYLE} />
                </label>
            </div>

            {loading && <p role="status">Loading rooms...</p>}
            {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}

            <section style={{ marginTop: 24, background: "white", padding: 20, borderRadius: 10 }}>
                <h2>Schedule: {date}</h2>
                <div style={{ overflowX: "auto" }}>
                    <table aria-label="Room schedules" style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr>
                            <th style={CELL_STYLE}>Room</th><th style={CELL_STYLE}>Location</th>
                            <th style={CELL_STYLE}>Time</th><th style={CELL_STYLE}>Status</th>
                        </tr></thead>
                        <tbody>
                            {filteredSchedules.flatMap(({ room, bookings }) => bookings.length > 0
                                ? bookings.map((booking) => <tr key={`${room.id}-${booking.bookingId}`}>
                                    <td style={CELL_STYLE}>{room.code}</td><td style={CELL_STYLE}>{room.location ?? "—"}</td>
                                    <td style={CELL_STYLE}>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</td>
                                    <td style={CELL_STYLE}>{booking.status}</td>
                                </tr>)
                                : [<tr key={room.id}>
                                    <td style={CELL_STYLE}>{room.code}</td><td style={CELL_STYLE}>{room.location ?? "—"}</td>
                                    <td style={CELL_STYLE}>No booking on this date</td>
                                    <td style={CELL_STYLE}>{["INACTIVE", "MAINTENANCE", "CLOSED"].includes(room.status.toUpperCase()) ? room.status : "Available"}</td>
                                </tr>])}
                        </tbody>
                    </table>
                </div>
                {!loading && !error && filteredSchedules.length === 0 && <p>No rooms found.</p>}
            </section>

            <section aria-label="Available rooms" style={{ marginTop: 24, background: "white", padding: 20, borderRadius: 10 }}>
                <h2>Available rooms: {startTime} - {endTime}</h2>
                <p>Rooms available for the whole selected time range.</p>
                {!loading && !error && (filteredAvailable.length > 0
                    ? <ul>{filteredAvailable.map((room) => <li key={room.id}>{room.code} — {room.name}</li>)}</ul>
                    : <p>No rooms available for this time range.</p>)}
            </section>
        </main>
    );
}

const CELL_STYLE = { textAlign: "left" as const, padding: 14, borderBottom: "1px solid #e5e7eb" };
const INPUT_STYLE = { padding: 9, border: "1px solid #d1d5db", borderRadius: 6, marginTop: 6 };

export default RoomSchedule;
