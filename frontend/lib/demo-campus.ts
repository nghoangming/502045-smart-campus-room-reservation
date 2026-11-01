import { mockAdminApi, type Incident, type Reservation, type Room, type Seat } from "@/lib/admin-data";

export type Session = { id: number; subject: string; className: string; roomId: number; roomCode: string; startTime: string; endTime: string; status: "Sắp diễn ra" | "Đang học" | "Đã kết thúc"; teacherId: number };
export type CampusUser = { id: number; name: string; email: string; role: "ADMIN" | "TEACHER" | "STUDENT"; status: "ACTIVE" | "INACTIVE" };
export type Equipment = { id: number; roomId: number; name: string; status: "Tốt" | "Cần kiểm tra" };

const day = (offset: number, hour: number) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return new Date(Date.UTC(value("year"), value("month") - 1, value("day") + offset, hour - 7)).toISOString();
};
const sessions: Session[] = [
  { id: 701, subject: "Lập trình ứng dụng Web", className: "IT004.01", roomId: 3, roomCode: "B204", startTime: day(0, 8), endTime: day(0, 10), status: "Sắp diễn ra", teacherId: 2 },
  { id: 702, subject: "Cơ sở dữ liệu nâng cao", className: "IT202.02", roomId: 1, roomCode: "A101", startTime: day(1, 9), endTime: day(1, 11), status: "Sắp diễn ra", teacherId: 2 },
  { id: 703, subject: "Thiết kế giao diện người dùng", className: "IT321.03", roomId: 2, roomCode: "A205", startTime: day(2, 13), endTime: day(2, 15), status: "Sắp diễn ra", teacherId: 2 },
  { id: 704, subject: "Thực hành AI căn bản", className: "AI101.01", roomId: 3, roomCode: "B204", startTime: day(4, 8), endTime: day(4, 10), status: "Sắp diễn ra", teacherId: 2 },
];
const users: CampusUser[] = [
  { id: 1, name: "Nguyễn Minh Anh", email: "admin@tdtu.edu.vn", role: "ADMIN", status: "ACTIVE" },
  { id: 2, name: "Trần Hoàng Nam", email: "teacher@tdtu.edu.vn", role: "TEACHER", status: "ACTIVE" },
  { id: 3, name: "Lê Thu Hà", email: "student@tdtu.edu.vn", role: "STUDENT", status: "ACTIVE" },
  { id: 4, name: "Phạm Quốc Bảo", email: "bao@tdtu.edu.vn", role: "STUDENT", status: "ACTIVE" },
  { id: 5, name: "Võ Thu Hương", email: "huong@tdtu.edu.vn", role: "TEACHER", status: "INACTIVE" },
];
const equipment: Equipment[] = [
  { id: 1, roomId: 3, name: "Máy chiếu Epson", status: "Cần kiểm tra" },
  { id: 2, roomId: 3, name: "Bộ máy tính phòng Lab", status: "Tốt" },
  { id: 3, roomId: 1, name: "Điều hòa trung tâm", status: "Tốt" },
  { id: 4, roomId: 2, name: "Micro không dây", status: "Cần kiểm tra" },
];
const clone = <T,>(value: T): T => structuredClone(value);
const seatAssignments = new Map<number, { sessionId: number; seatId: number }>();
export const demoSeatApi = {
  async current(userId: number) { return seatAssignments.get(userId) ?? null; },
  async choose(userId: number, sessionId: number, seatId: number) {
    const available = (await mockAdminApi.listSeats()).find(seat => seat.id === seatId && seat.roomId === sessions.find(session => session.id === sessionId)?.roomId);
    if (!available || available.status !== "AVAILABLE" || [...seatAssignments.entries()].some(([owner, choice]) => owner !== userId && choice.sessionId === sessionId && choice.seatId === seatId)) throw new Error("Ghế vừa được người khác chọn hoặc không còn trống. Hãy tải lại sơ đồ.");
    seatAssignments.set(userId, { sessionId, seatId });
    return seatAssignments.get(userId)!;
  },
  async cancel(userId: number) { seatAssignments.delete(userId); },
};

// Read-only mock API adapter. Only Room/Reservation/Seat/Incident response fields
// mirror the supplied models. Sessions, users, equipment and attendance are demo-only.
export const demoCampusApi = {
  rooms: (): Promise<Room[]> => mockAdminApi.listRooms(),
  reservations: (): Promise<Reservation[]> => mockAdminApi.listReservations(),
  seats: (): Promise<Seat[]> => mockAdminApi.listSeats(),
  incidents: (): Promise<Incident[]> => mockAdminApi.listIncidents(),
  sessions: async (): Promise<Session[]> => clone(sessions),
  users: async (): Promise<CampusUser[]> => clone(users),
  equipment: async (): Promise<Equipment[]> => clone(equipment),
};
