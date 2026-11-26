"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ScanLine, X } from "lucide-react";
import jsQR from "jsqr";

export function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setRunning(false);
    setStarting(false);
  }, []);

  const close = useCallback(() => {
    requestRef.current += 1;
    stop();
    setOpen(false);
    setError("");
    openButtonRef.current?.focus();
  }, [stop]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  useEffect(() => () => {
    requestRef.current += 1;
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const start = async () => {
    const request = ++requestRef.current;
    setOpen(true);
    setStarting(true);
    setError("");
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError("Camera cần kết nối HTTPS. Địa chỉ HTTP dùng IPv4 trong mạng nội bộ không được iPhone cấp quyền camera.");
        setStarting(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (request !== requestRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stop(); return; }
      video.srcObject = stream;
      await video.play();
      if (request !== requestRef.current) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) { stop(); setError("Không thể khởi tạo bộ đọc QR. Hãy nhập mã thủ công."); return; }
      setRunning(true);
      setStarting(false);
      timerRef.current = setInterval(() => {
        if (!video.videoWidth || !video.videoHeight) return;
        try {
          const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(frame.data, frame.width, frame.height);
          if (code?.data) { onCode(code.data); close(); }
        } catch {
          stop();
          setError("Không thể đọc hình từ camera. Hãy mở lại camera hoặc nhập mã thủ công.");
        }
      }, 350);
    } catch (reason) {
      if (request !== requestRef.current) return;
      stop();
      const name = reason instanceof DOMException ? reason.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Trình duyệt đã chặn camera. Hãy mở trang bằng HTTPS, rồi cho phép quyền Camera trong cài đặt trang.");
      } else if (name === "NotFoundError") {
        setError("Không tìm thấy camera trên thiết bị này.");
      } else {
        setError("Không thể mở camera. Hãy kiểm tra quyền camera của trình duyệt hoặc nhập mã thủ công.");
      }
    }
  };

  return <>
    <div className="ws-qr-scanner">
      <button ref={openButtonRef} type="button" className="ws-button secondary" onClick={() => void start()}><ScanLine size={17} /> Mở camera quét QR</button>
    </div>
    {typeof document !== "undefined" && createPortal(
      <div className="ws-camera-overlay" hidden={!open} onClick={event => { if (event.target === event.currentTarget) close(); }}>
        <section className="ws-camera-dialog" role="dialog" aria-modal="true" aria-labelledby="ws-camera-title">
          <div className="ws-camera-header">
            <div className="ws-camera-heading"><span className="ws-camera-icon"><ScanLine size={21} /></span><div><span className="ws-camera-eyebrow">ĐIỂM DANH BUỔI HỌC</span><h2 id="ws-camera-title">Quét mã QR</h2></div></div>
            <button ref={closeButtonRef} type="button" className="ws-camera-close" onClick={close} aria-label="Đóng camera"><X size={22} /></button>
          </div>
          <p className="ws-camera-description">Đưa mã QR do giảng viên hiển thị vào giữa khung hình.</p>
          <div className={`ws-camera-preview${running ? " is-running" : ""}`}>
            <video ref={videoRef} playsInline muted autoPlay />
            {running && <div className="ws-camera-guide" aria-hidden="true" />}
            {!running && <div className="ws-camera-placeholder"><ScanLine size={36} /><span>{starting ? "Đang mở camera..." : "Camera chưa sẵn sàng"}</span></div>}
          </div>
          {error && <p className="ws-camera-error" role="alert">{error}</p>}
          <div className="ws-camera-footer"><span>Mã được điền tự động sau khi quét thành công.</span><button type="button" className="ws-button secondary" onClick={close}>Đóng camera</button></div>
        </section>
      </div>, document.body)}
  </>;
}
