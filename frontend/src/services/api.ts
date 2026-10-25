
const BASE_URL = "/api/v1";

export interface RoomDto {
  id: number;
  code: string;
  name: string;
  location: string | null;
  status: string;
}

export interface RoomScheduleDto {
  bookingId: number;
  startTime: string;
  endTime: string;
  status: string;
}

export interface SeatAvailabilityDto {
  seatNumber: number;
  available: boolean;
}

export interface ReservationRequest {
  roomId: number;
  classSessionId?: number | null;
  startTime: string;
  endTime: string;
  note?: string;
}

export interface ReservationResponse {
  id: number;
  userId: number;
  roomId: number;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
}

export interface CreateBookingRequest {
  roomId: number;
  date: string;
  startTime: string;
  endTime: string;
  numberOfPeople: number;
  seatNumbers: number[];
  purpose: string;
}

const jsonHeaders = {
  "Content-Type": "application/json",
};

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new Error(
      "Không thể kết nối Backend. Hãy kiểm tra server và Vite Proxy."
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();

      if (data?.message) {
        message = data.message;
      }
    } catch {
      // Giữ thông báo lỗi mặc định
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function extractList<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (result !== null && typeof result === "object") {
    const data = result as Record<string, unknown>;

    if (Array.isArray(data.data)) {
      return data.data as T[];
    }

    if (Array.isArray(data.content)) {
      return data.content as T[];
    }

    if (Array.isArray(data.items)) {
      return data.items as T[];
    }
  }

  console.error("Dữ liệu API không đúng cấu trúc:", result);
  return [];
}

// Đăng nhập
export async function loginApi(credentials: {
  username?: string;
  email?: string;
  password: string;
}): Promise<unknown> {
  return request("/auth/login", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(credentials),
  });
}

// Lấy danh sách phòng
export async function fetchRooms(): Promise<RoomDto[]> {
  const result = await request<unknown>("/rooms");
  return extractList<RoomDto>(result);
}

// Lấy thông tin một phòng
export async function fetchRoomById(
  id: number | string
): Promise<RoomDto> {
  return request<RoomDto>(`/rooms/${id}`);
}

// Lấy lịch phòng theo ngày
export async function fetchRoomSchedule(
  roomId: number | string,
  date: string
): Promise<RoomScheduleDto[]> {
  const params = new URLSearchParams({ date });

  const result = await request<unknown>(
    `/rooms/${roomId}/schedule?${params.toString()}`
  );

  return extractList<RoomScheduleDto>(result);
}

// Lấy danh sách phòng còn trống theo thời gian
export async function fetchAvailableRooms(
  date: string,
  startTime: string,
  endTime: string
): Promise<RoomDto[]> {
  const params = new URLSearchParams({
    date,
    startTime,
    endTime,
  });

  const result = await request<unknown>(
    `/rooms/availability?${params.toString()}`
  );

  return extractList<RoomDto>(result);
}

// Tạo phòng
export async function createRoom(
  data: Partial<RoomDto>
): Promise<RoomDto> {
  return request<RoomDto>("/rooms", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(data),
  });
}

// Cập nhật phòng
export async function updateRoom(
  id: number | string,
  data: Partial<RoomDto>
): Promise<RoomDto> {
  return request<RoomDto>(`/rooms/${id}`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(data),
  });
}

// Xóa phòng
export async function deleteRoom(
  id: number | string
): Promise<void> {
  return request<void>(`/rooms/${id}`, {
    method: "DELETE",
  });
}

// Lấy trạng thái ghế
export async function fetchSeatAvailability(
  roomId: number | string,
  date: string,
  startTime: string,
  endTime: string
): Promise<SeatAvailabilityDto[]> {
  const params = new URLSearchParams({
    date,
    startTime,
    endTime,
  });

  const result = await request<unknown>(
    `/rooms/${roomId}/seats/availability?${params.toString()}`
  );

  return extractList<SeatAvailabilityDto>(result);
}

// Tạo yêu cầu đặt phòng theo API đặt phòng tự học cũ
export async function createBooking(
  data: CreateBookingRequest
): Promise<unknown> {
  return request("/bookings", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(data),
  });
}

// Tạo yêu cầu đặt phòng theo backend Reservation
export async function createReservation(
  data: ReservationRequest
): Promise<ReservationResponse> {
  return request<ReservationResponse>(
    "/classroom-reservations",
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(data),
    }
  );
}

// Lấy danh sách yêu cầu đặt phòng
export async function fetchReservations(
  status?: string
): Promise<ReservationResponse[]> {
  const params = new URLSearchParams();

  if (status && status !== "ALL") {
    params.set("status", status);
  }

  const query = params.toString();

  const result = await request<unknown>(
    `/classroom-reservations${query ? `?${query}` : ""}`
  );

  return extractList<ReservationResponse>(result);
}

// Hủy yêu cầu đặt phòng
export async function cancelReservation(
  id: number | string
): Promise<ReservationResponse> {
  return request<ReservationResponse>(
    `/classroom-reservations/${id}/cancel`,
    {
      method: "PATCH",
    }
  );
}
