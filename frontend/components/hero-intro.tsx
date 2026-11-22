import { Building2, GraduationCap, Presentation } from "lucide-react";

const roles = [
  {
    title: "Sinh viên",
    description: "Xem lịch học, chọn chỗ ngồi, đặt phòng tự học và check-in tại lớp.",
    icon: GraduationCap,
  },
  {
    title: "Giảng viên",
    description: "Theo dõi buổi dạy, đặt phòng, điểm danh và báo vắng khi cần.",
    icon: Presentation,
  },
  {
    title: "Quản trị viên",
    description: "Quản lý phòng, tài khoản, yêu cầu đặt chỗ và sự cố tập trung.",
    icon: Building2,
  },
];

export function HeroIntro() {
  return <section id="top" className="hero">
    <div className="hero-image" />
    <div className="hero-content container">
      <div className="hero-copy"><div className="eyebrow hero-eyebrow"><span className="eyebrow-line" /> NỀN TẢNG KHÔNG GIAN HỌC TẬP THẾ HỆ MỚI</div>
        <h1>Không gian học tập <em>thông minh.</em><br />Chọn chỗ trong <em>tích tắc.</em></h1>
        <p>Số hóa trải nghiệm học tập tại TDTU. Khám phá giảng đường, phòng thực hành và không gian tự học — tất cả trong một nền tảng.</p>
        <div className="hero-highlights"><span><span className="check-mark">✓</span> Tìm phòng dễ dàng</span><span><span className="check-mark">✓</span> Chọn ghế trực quan</span><span><span className="check-mark">✓</span> Check-in bằng QR</span></div>
      </div>
      <div id="gioi-thieu" className="intro-shell">
        <div className="intro-heading">
          <div><span className="intro-kicker">GIỚI THIỆU HỆ THỐNG</span><h2>Một nền tảng cho cả khuôn viên.</h2></div>
          <p>TDTU Smart Campus kết nối lịch học, không gian và những người sử dụng chúng. Mỗi vai trò có công cụ phù hợp để công việc hằng ngày rõ ràng và thuận tiện hơn.</p>
        </div>
        <div className="intro-roles" aria-label="Hệ thống dành cho">
          {roles.map(({ title, description, icon: Icon }) => <article className="intro-role" key={title}>
            <span className="intro-role-icon"><Icon size={20} strokeWidth={1.8} /></span>
            <div><h3>{title}</h3><p>{description}</p></div>
          </article>)}
        </div>
      </div>
    </div>
  </section>;
}
