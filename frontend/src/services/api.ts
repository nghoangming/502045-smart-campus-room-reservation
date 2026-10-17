export type User = {
    id: number;
    username: string;
    fullName: string;
    email: string;
    role: string | null;
    roles: string[];
};

export type Room = { id: number; code: string; name: string; location: string | null; status: string };
export type Booking = { bookingId: number; startTime: string; endTime: string; status: string };

export function clearLogin() {
    for (const key of ["smartCampusToken", "smartCampusUser", "smartCampusLoggedIn", "smartCampusUsername"]) {
        localStorage.removeItem(key);
    }
}

export async function apiRequest<Result>(path: string, options: RequestInit = {}): Promise<Result> {
    const headers = new Headers(options.headers);
    const token = localStorage.getItem("smartCampusToken");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body) headers.set("Content-Type", "application/json");
    const response = await fetch(`/api/v1${path}`, { ...options, headers });
    if (!response.ok) {
        const error = await response.json().catch(() => null);
        if (response.status === 401) clearLogin();
        throw new Error(error?.message ?? `Request failed (${response.status}). Please try again.`);
    }
    return response.json() as Promise<Result>;
}

export async function login(username: string, password: string) {
    // Avoid attaching an expired token to a new login attempt.
    clearLogin();
    const response = await apiRequest<{ token: string; user: User }>("/auth/login", {
        method: "POST", body: JSON.stringify({ username, password }),
    });
    localStorage.setItem("smartCampusToken", response.token);
    localStorage.setItem("smartCampusUser", JSON.stringify(response.user));
    localStorage.setItem("smartCampusLoggedIn", "true");
    localStorage.setItem("smartCampusUsername", response.user.username);
    return response.user;
}

export function campusDate() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}
