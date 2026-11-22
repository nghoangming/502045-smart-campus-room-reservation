"use client";

import { useState } from "react";
import { ArrowRight, ArrowUpRight, Building2, CalendarDays, Check, Cpu, DoorOpen, QrCode, ShieldCheck, UsersRound, Wrench } from "lucide-react";

const initialSeats = ["free","free","taken","free","free","free","free","free","blocked","free","free","taken","free","free","free","free","taken","free","free","free","free","free","free","blocked","free","free","taken","free","free","free"];
function SeatPicker() {
  const [seat, setSeat] = useState<number | null>(null);
  return <div className="seat-demo" aria-label="Minh họa sơ đồ chọn ghế">
    <div className="seat-demo-top"><span>PHÒNG LÝ THUYẾT · A702</span><span>SƠ ĐỒ GHẾ</span></div>
    <strong className="seat-demo-title">Phương pháp lập trình</strong>
    <div className="seat-stage">BẢNG GIẢNG DẠY</div>
    <div className="seat-grid">{initialSeats.map((status, i) => {
      const label = status === "taken" ? "đã có người đặt" : status === "blocked" ? "không sử dụng" : seat === i ? "đang chọn" : "còn trống";
      return <button type="button" key={i} title={`Ghế ${i + 1}: ${label}`} aria-label={`Ghế ${i + 1}: ${label}`} aria-pressed={seat === i} disabled={status !== "free"} onClick={() => setSeat(seat === i ? null : i)} className={`seat ${seat === i ? "selected" : status}`}>{status === "blocked" ? "×" : String(i + 1).padStart(2, "0")}</button>;
    })}</div>
    <div className="seat-bottom"><div className="seat-legend"><span><i className="legend-dot available" /> Còn trống</span><span><i className="legend-dot selected" /> Đang chọn</span><span><i className="legend-dot occupied" /> Đã đặt</span></div><strong className="seat-selection">{seat === null ? "Chọn một ghế trắng" : `Đang chọn ghế ${String(seat + 1).padStart(2, "0")}`}</strong></div>
  </div>;
}

function CheckInPreview() {
  return <div className="phone-demo" aria-label="Minh họa check-in QR thành công">
    <div className="phone-notch" />
    <div className="phone-app"><div className="phone-tiny">TDTU SMART CAMPUS</div><div className="phone-qr"><QrCode size={78} strokeWidth={1.2} /></div><div className="phone-success"><Check size={15} /> Check-in thành công</div><small>Chào mừng bạn đến phòng A702</small></div>
  </div>;
}

function BookingPreview() {
  return <div className="booking-preview" aria-label="Minh họa yêu cầu đặt phòng đang chờ duyệt">
    <div className="booking-preview-head"><span><CalendarDays size={15} /> Yêu cầu của tôi</span><small>01 yêu cầu</small></div>
    <div className="booking-preview-body"><div><small>PHÒNG LÝ THUYẾT · A702</small><strong>Phương pháp lập trình</strong><span>08:45 – 09:00</span></div><span className="booking-preview-status">Chờ duyệt</span></div>
    <div className="booking-preview-foot">Quản trị viên xem xét yêu cầu đặt phòng.</div>
  </div>;
}

function IncidentPreview() {
  return <div className="incident-preview" aria-label="Minh họa biểu mẫu báo cáo sự cố của giảng viên">
    <div className="incident-preview-head"><Wrench size={16} /><div><strong>Báo cáo sự cố mới</strong><small>Gửi trực tiếp đến quản trị viên</small></div></div>
    <div className="incident-preview-fields"><div><small>PHÒNG</small><strong>A702</strong></div><div><small>LOẠI SỰ CỐ</small><strong>Máy chiếu</strong></div></div>
    <div className="incident-preview-description"><small>MÔ TẢ</small><span>Máy chiếu không hiển thị hình ảnh...</span></div>
    <span className="incident-preview-submit">Gửi báo cáo <ArrowRight size={14} /></span>
  </div>;
}

const facilities = [
  { name: "Phòng Lab máy tính", subtitle: "Bàn máy tính và ghế cá nhân", detail: "Không gian thực hành theo dãy bàn", badge: "THỰC HÀNH", icon: Cpu, cls: "lab" },
  { name: "Phòng học lý thuyết", subtitle: "Bàn ghế và bảng viết tiêu chuẩn", detail: "Phù hợp cho các buổi học trên lớp", badge: "LỚP HỌC", icon: UsersRound, cls: "classroom" },
  { name: "Phòng tự học nhóm", subtitle: "Dãy phòng nhỏ liền kề", detail: "Mỗi phòng khoảng 8–10 chỗ ngồi", badge: "8–10 NGƯỜI", icon: DoorOpen, cls: "study" },
];

export function CampusContent() {
  return <>
    <section id="quy-trinh" className="features-section section-pad"><div className="container"><div className="section-heading"><div><span className="section-kicker"><span /> TRẢI NGHIỆM KHÁC BIỆT</span><h2>Mọi thứ bạn cần.<br /><em>Trong một nơi.</em></h2></div><p>Từ lúc tìm phòng đến khi check-in, mỗi bước đều được thiết kế để việc học tập trở nên đơn giản hơn.</p></div>
      <div className="bento-grid"><article className="feature-card seat-feature"><div className="feature-text"><div className="feature-icon red-icon"><DoorOpen size={22} /></div><span className="feature-number">01 / KHÁM PHÁ</span><h3>Chọn ghế theo cách của bạn.</h3><p>Sơ đồ phòng trực quan giúp bạn thấy ngay ghế nào còn trống. Chạm để thử chọn một vị trí yêu thích.</p><span className="feature-demo-note">Chạm vào ghế trắng để thử chọn</span></div><SeatPicker /></article>
      <article className="feature-card qr-feature"><div className="feature-icon blue-icon"><QrCode size={22} /></div><span className="feature-number">02 / CHECK-IN</span><h3>Một lần quét.<br />Sẵn sàng học.</h3><p>Giảng viên tạo mã QR; sinh viên đã đặt ghế có thể quét mã trong giờ điểm danh.</p><CheckInPreview /></article>
      <article className="feature-card approve-feature"><div className="feature-icon violet-icon"><ShieldCheck size={22} /></div><span className="feature-number">03 / ĐẶT PHÒNG</span><h3>Gửi yêu cầu.<br />Theo dõi trạng thái.</h3><p>Hệ thống kiểm tra lịch trùng, sau đó quản trị viên duyệt yêu cầu đặt phòng.</p><BookingPreview /></article>
      <article className="feature-card report-feature"><div className="report-content"><div className="feature-icon amber-icon"><Wrench size={22} /></div><span className="feature-number">04 / HỖ TRỢ</span><h3>Gặp sự cố?<br />Báo ngay trên hệ thống.</h3><p>Giảng viên gửi báo cáo thiết bị hoặc phòng học để quản trị viên tiếp nhận và xử lý.</p><a className="feature-link" href="/login">Đăng nhập để báo cáo <ArrowUpRight size={17} /></a></div><IncidentPreview /></article></div>
    </div></section>
    <section id="khong-gian" className="facilities-section section-pad"><div className="container"><div className="section-heading facility-heading"><div><span className="section-kicker"><span /> KHÁM PHÁ KHÔNG GIAN</span><h2>Nơi ý tưởng<br /><em>được bắt đầu.</em></h2></div><p>Ba kiểu phòng quen thuộc cho việc học và làm việc nhóm hằng ngày.</p></div><div className="facility-grid">{facilities.map((f, i) => <article className="facility-card" key={f.name}><div className={`facility-photo ${f.cls}`} role="img" aria-label={`Hình minh họa ${f.name}`}><span className={`facility-badge ${f.cls}`}>{f.badge}</span></div><div className="facility-body"><div className="facility-title"><span className="facility-icon"><f.icon size={23} /></span><span className="facility-index">0{i+1} / 03</span></div><h3>{f.name}</h3><p>{f.subtitle}</p><div className="facility-footer"><span>{f.detail}</span></div></div></article>)}</div></div></section>
    <section id="ban-do" className="cta-section"><div className="container cta-inner"><div><span className="section-kicker light-kicker"><span /> BẮT ĐẦU KHÁM PHÁ</span><h2>Không gian của bạn.<br /><em>Hành trình của bạn.</em></h2><p>Khuôn viên Đại học Tôn Đức Thắng, 19 Nguyễn Hữu Thọ, P. Tân Phong, Quận 7, TP.HCM.</p></div><a href="https://360.tdtu.edu.vn/main/" target="_blank" rel="noopener noreferrer" className="cta-link">Khám phá không gian 360° <ArrowRight size={19} /></a><div className="cta-orbit cta-orbit-one" /><div className="cta-orbit cta-orbit-two" /></div></section>
    <Footer />
  </>;
}

function Footer() { return <footer id="ho-tro" className="footer"><div className="container"><div className="footer-main"><div className="footer-brand"><a className="brand" href="#top"><span className="brand-icon"><Building2 size={22} /></span><span className="brand-name">TDTU <strong>Smart Campus</strong><small>KHÔNG GIAN CHO TƯƠNG LAI</small></span></a><p>Kết nối con người, không gian và những cơ hội học tập không giới hạn.</p></div><div className="footer-links"><div><strong>Khám phá</strong><a href="#gioi-thieu">Giới thiệu hệ thống</a><a href="#khong-gian">Không gian học tập</a><a href="#quy-trinh">Quy trình đặt chỗ</a></div><div><strong>Hỗ trợ</strong><a href="https://www.tdtu.edu.vn/" target="_blank" rel="noopener noreferrer">Sinh viên & Giảng viên</a><a href="mailto:helpdesk@tdtu.edu.vn">IT Helpdesk</a><a href="https://www.tdtu.edu.vn/" target="_blank" rel="noopener noreferrer">Website TDTU</a></div><div><strong>Liên hệ</strong><span>19 Nguyễn Hữu Thọ</span><span>P. Tân Phong, Quận 7</span><span>TP. Hồ Chí Minh</span></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} TDTU Smart Campus. Giao diện giới thiệu minh họa.</span><span><span className="status-dot" /> Hệ thống sẵn sàng</span></div></div></footer>; }
