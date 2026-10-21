// Sử dụng đường dẫn tương đối để đi qua Vite Proxy (/api/v1 -> http://localhost:8080/api/v1)
// tránh lỗi chặn CORS khi gọi từ trình duyệt (localhost:5173) sang Spring Boot (localhost:8080).
const BASE_URL = "/api/v1";

// ==========================================
// KIỂU DỮ LIỆU KHỚP VỚI BACKEND DTO (M2)
// ==========================================

// Khớp với com.smartcampus.dto.RoomResponse
export interface RoomDto {
    id: number;
    code: string;
    name: string;
    location: string | null;
    status: string;
}

// Khớp với com.smartcampus.dto.RoomScheduleResponse
export interface RoomScheduleDto {
    bookingId: number;
    startTime: string;
    endTime: string;
    status: string;
}

// Helper xử lý phản hồi từ Server một cách an toàn
async function handleResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
    if (!res.ok) {
        let errorData = defaultErrorMsg;
        try {
            const data = await res.json();
            if (data && data.message) errorData = data.message;
        } catch (_) {}
        throw new Error(errorData);
    }
    return res.json() as Promise<T>;
}

// ==========================================
// 1. AUTHENTICATION API
// ==========================================

export async function loginApi(credentials: { username?: string; email?: string; password: string }) {
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
        });
        return await handleResponse<any>(res, "Incorrect username or password");
    } catch (err: any) {
        throw new Error(err.message || "Cannot connect to authentication server.");
    }
}

// ==========================================
// 2. ROOMS API (Khớp với RoomController.java)
// ==========================================

// GET /api/v1/rooms — Lấy danh sách tất cả các phòng
export async function fetchRooms(): Promise<RoomDto[]> {
    try {
        const res = await fetch(`${BASE_URL}/rooms`);
        return await handleResponse<RoomDto[]>(res, "Failed to fetch rooms from server.");
    } catch (err: any) {
        throw new Error(err.message || "Failed to fetch rooms. Please check your Backend connection.");
    }
}

// GET /api/v1/rooms/{id} — Lấy chi tiết một phòng theo ID
export async function fetchRoomById(id: number | string): Promise<RoomDto> {
    try {
        const res = await fetch(`${BASE_URL}/rooms/${id}`);
        return await handleResponse<RoomDto>(res, `Room #${id} not found.`);
    } catch (err: any) {
        throw new Error(err.message || "Failed to fetch room details.");
    }
}

// GET /api/v1/rooms/{id}/schedule?date=YYYY-MM-DD — Lấy lịch đặt của một phòng trong ngày
export async function fetchRoomSchedule(roomId: number | string, date: string): Promise<RoomScheduleDto[]> {
    try {
        const params = new URLSearchParams({ date });
        const res = await fetch(`${BASE_URL}/rooms/${roomId}/schedule?${params.toString()}`);
        return await handleResponse<RoomScheduleDto[]>(res, "Failed to fetch room schedule from server.");
    } catch (err: any) {
        throw new Error(err.message || "Failed to fetch room schedule. Please check your Backend connection.");
    }
}

// GET /api/v1/rooms/availability?date=YYYY-MM-DD&startTime=HH:mm&endTime=HH:mm — Tìm phòng trống theo khung giờ
export async function fetchAvailableRooms(
    date: string,
    startTime: string,
    endTime: string
): Promise<RoomDto[]> {
    try {
        const params = new URLSearchParams({ date, startTime, endTime });
        const res = await fetch(`${BASE_URL}/rooms/availability?${params.toString()}`);
        return await handleResponse<RoomDto[]>(res, "Failed to check room availability.");
    } catch (err: any) {
        throw new Error(err.message || "Failed to check room availability. Please check your Backend connection.");
    }
}

// POST /api/v1/rooms — Tạo phòng mới (dự kiến cho Admin)
export async function createRoom(data: Partial<RoomDto>) {
    try {
        const res = await fetch(`${BASE_URL}/rooms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return await handleResponse<RoomDto>(res, "Failed to create room.");
    } catch (err: any) {
        throw new Error(err.message || "Could not save room. Server connection error.");
    }
}

// PUT /api/v1/rooms/{id} — Cập nhật thông tin phòng (dự kiến cho Admin)
export async function updateRoom(id: number | string, data: Partial<RoomDto>) {
    try {
        const res = await fetch(`${BASE_URL}/rooms/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return await handleResponse<RoomDto>(res, "Failed to update room.");
    } catch (err: any) {
        throw new Error(err.message || "Could not update room. Server connection error.");
    }
}

// DELETE /api/v1/rooms/{id} — Xóa phòng (dự kiến cho Admin)
export async function deleteRoom(id: number | string) {
    try {
        const res = await fetch(`${BASE_URL}/rooms/${id}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete room.");
        return true;
    } catch (err: any) {
        throw new Error(err.message || "Could not delete room. Server connection error.");
    }
}
