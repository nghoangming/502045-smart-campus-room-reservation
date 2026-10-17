import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { apiRequest, clearLogin } from "../services/api";
import type { User } from "../services/api";

export default function RequireLogin({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");
    useEffect(() => {
        let active = true;
        if (!localStorage.getItem("smartCampusToken")) {
            setStatus("denied");
            return;
        }
        apiRequest<User>("/auth/me").then((user) => {
            if (!active) return;
            localStorage.setItem("smartCampusUser", JSON.stringify(user));
            setStatus("ready");
        }).catch(() => {
            if (!active) return;
            clearLogin();
            setStatus("denied");
        });
        return () => { active = false; };
    }, []);
    if (status === "loading") return <p role="status">Checking your session...</p>;
    if (status === "denied") return <Navigate to="/login" replace />;
    return children;
}
