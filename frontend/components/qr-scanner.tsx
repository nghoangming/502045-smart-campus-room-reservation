"use client";

import { useEffect, useRef, useState } from "react";

type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

export function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setRunning(false);
  };
  useEffect(() => stop, []);

  const start = async () => {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Trình duyệt không cho phép dùng camera trên kết nối này. Hãy mở trang bằng HTTPS hoặc localhost.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) { stop(); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const BarcodeDetector = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
      if (!BarcodeDetector) {
        stop();
        setError("Camera đã được cấp quyền, nhưng trình duyệt này chưa có bộ đọc QR. Hãy dùng Safari/Chrome mới hơn hoặc nhập mã thủ công.");
        return;
      }
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      setRunning(true);
      let busy = false;
      timerRef.current = setInterval(async () => {
        if (busy || !videoRef.current) return;
        busy = true;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) { onCode(codes[0].rawValue); stop(); }
        } catch {
          stop();
          setError("Không thể đọc hình từ camera. Hãy mở lại camera hoặc nhập mã thủ công.");
        } finally { busy = false; }
      }, 350);
    } catch (reason) {
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

  return <div className="ws-qr-scanner">
    <video ref={videoRef} playsInline muted style={{ display: running ? "block" : "none", width: "100%", borderRadius: 8 }} />
    <button type="button" className="ws-button secondary" onClick={running ? stop : start}>{running ? "Đóng camera" : "Mở camera quét QR"}</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
