const BASE_URL = "http://localhost:8080/api";

// Helper xử lý phản hồi từ Server một cách an toàn
async function handleResponse(res: Response, defaultErrorMsg: string) {
    if (!res.ok) {
        let errorData = defaultErrorMsg;
        try {
            const data = await res.json();
            if (data && data.message) errorData = data.message;
        } catch (_) {}
        throw new Error(errorData);
    }
    return res.json();
}

// ==========================================
// 1. AUTHENTICATION API
// ==========================================

export async function loginApi(credentials: { username: string; password: string }) {
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
        });
        return await handleResponse(res, "Incorrect username or password");
    } catch (err: any) {
        throw new Error(err.message || "Cannot connect to authentication server.");
    }
}

// ==========================================
// 2. ROOMS MANAGEMENT API
// ==========================================

export async function fetchRooms() {
    try {
        const res = await fetch(`${BASE_URL}/rooms`);
        return await handleResponse(res, "Failed to fetch rooms from server.");
    } catch (err: any) {
        throw new Error(err.message || "Failed to fetch rooms. Please check your Backend connection.");
    }
}

export async function createRoom(data: any) {
    try {
        const res = await fetch(`${BASE_URL}/rooms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return await handleResponse(res, "Failed to create room.");
    } catch (err: any) {
        throw new Error(err.message || "Could not save room. Server connection error.");
    }
}

export async function updateRoom(id: string, data: any) {
    try {
        const res = await fetch(`${BASE_URL}/rooms/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return await handleResponse(res, "Failed to update room.");
    } catch (err: any) {
        throw new Error(err.message || "Could not update room. Server connection error.");
    }
}

export async function deleteRoom(id: string) {
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

// ==========================================
// 3. ROOM SCHEDULE API
// ==========================================

export async function fetchSchedules(date?: string, roomId?: string) {
    try {
        let url = `${BASE_URL}/schedules`;
        const params = new URLSearchParams();
        if (date) params.append("date", date);
        if (roomId && roomId !== "All Rooms") params.append("roomId", roomId);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        return await handleResponse(res, "Failed to fetch schedules from server.");
    } catch (err: any) {
        throw new Error(err.message || "Failed to fetch schedules. Please check your Backend connection.");
    }
}

export async function createSchedule(data: any) {
    try {
        const res = await fetch(`${BASE_URL}/schedules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return await handleResponse(res, "Failed to create schedule.");
    } catch (err: any) {
        throw new Error(err.message || "Could not save schedule. Server connection error.");
    }
}

export async function updateSchedule(id: string, data: any) {
    try {
        const res = await fetch(`${BASE_URL}/schedules/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return await handleResponse(res, "Failed to update schedule.");
    } catch (err: any) {
        throw new Error(err.message || "Could not update schedule. Server connection error.");
    }
}

export async function deleteSchedule(id: string) {
    try {
        const res = await fetch(`${BASE_URL}/schedules/${id}`, {
            method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete schedule.");
        return true;
    } catch (err: any) {
        throw new Error(err.message || "Could not delete schedule. Server connection error.");
    }
}