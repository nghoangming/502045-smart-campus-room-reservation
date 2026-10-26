
import { useEffect, useState, type FormEvent } from "react";
import {
  fetchRooms,
  fetchReservations,
  createReservation,
  cancelReservation,
  fetchSeatAvailability,
  type RoomDto,
  type ReservationResponse,
  type SeatAvailabilityDto,
} from "../services/api";
import SeatPicker from "../pages/SeatPicker";

const primary = "#2563eb";
const border = "#e2e8f0";
const muted = "#64748b";

const timeOptions = Array.from({ length: 21 }, (_, i) => {
  const minutes = 8 * 60 + i * 30;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const statusInfo = (status: string) => {
  switch (status.toUpperCase()) {
    case "PENDING":
      return { label: "Chờ xác nhận", bg: "#fef3c7", color: "#92400e" };
    case "CONFIRMED":
      return { label: "Đã xác nhận", bg: "#dcfce7", color: "#166534" };
    case "CANCELLED":
      return { label: "Đã hủy", bg: "#fee2e2", color: "#b91c1c" };
    case "REJECTED":
      return { label: "Đã từ chối", bg: "#fce7f3", color: "#9d174d" };
    default:
      return { label: status, bg: "#e2e8f0", color: "#334155" };
  }
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("vi-VN");
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      });
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "11px 12px",
  border: `1px solid ${border}`,
  borderRadius: 8,
  background: "#ffffff",
  fontSize: 14,
  color: "#0f172a",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 650,
  marginBottom: 7,
};

export default function StudyRoomBooking() {
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [reservations, setReservations] = useState<ReservationResponse[]>([]);

  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState(today());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [note, setNote] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [seatAvailability, setSeatAvailability] = useState<SeatAvailabilityDto[]>([]);
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatError, setSeatError] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [roomData, reservationData] = await Promise.all([
        fetchRooms(),
        fetchReservations(
          statusFilter === "ALL" ? undefined : statusFilter
        ),
      ]);

      setRooms(roomData);
      setReservations(reservationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [statusFilter]);

  useEffect(() => {
    if (!roomId || !date || !startTime || !endTime || startTime >= endTime) {
      setSeatAvailability([]);
      setSelectedSeats([]);
      setSeatError("");
      setSeatLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSeats() {
      setSeatLoading(true);
      setSeatError("");
      setSeatAvailability([]);
      setSelectedSeats([]);

      try {
        const result = await fetchSeatAvailability(
          roomId,
          date,
          startTime,
          endTime
        );

        if (!cancelled) {
          setSeatAvailability(result);
        }
      } catch (err) {
        if (!cancelled) {
          setSeatAvailability([]);
          setSeatError(
            err instanceof Error
              ? err.message
              : "Không thể tải tình trạng ghế."
          );
        }
      } finally {
        if (!cancelled) {
          setSeatLoading(false);
        }
      }
    }

    void loadSeats();

    return () => {
      cancelled = true;
    };
  }, [roomId, date, startTime, endTime]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!roomId) {
      setError("Vui lòng chọn phòng học.");
      return;
    }

    if (date < today()) {
      setError("Không thể đặt phòng trong ngày đã qua.");
      return;
    }

    if (startTime >= endTime) {
      setError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    if (seatLoading) {
      setError("Vui lòng chờ tải xong tình trạng ghế.");
      return;
    }

    if (seatError) {
      setError("Không thể xác nhận tình trạng ghế. Vui lòng thử lại.");
      return;
    }

    if (selectedSeats.some(
      (seatNumber) =>
        !seatAvailability.some(
          (seat) => seat.seatNumber === seatNumber && seat.available
        )
    )) {
      setError("Có ghế đã chọn không còn khả dụng. Vui lòng chọn lại.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await createReservation({
        roomId: Number(roomId),
        startTime: `${date}T${startTime}:00+07:00`,
        endTime: `${date}T${endTime}:00+07:00`,
        note: note.trim() || undefined,
      });

      setSuccess(
        `Đặt phòng thành công! Mã reservation: #${result.id}.` +
        (selectedSeats.length > 0
          ? ` Bạn đã chọn ghế: ${selectedSeats.join(", ")}. Lưu ý: danh sách ghế chưa được gửi đến Backend.`
          : "")
      );

      setNote("");

      const updated = await fetchReservations(
        statusFilter === "ALL" ? undefined : statusFilter
      );
      setReservations(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Đặt phòng thất bại. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id: number) {
    if (!window.confirm(`Bạn có muốn hủy reservation #${id}?`)) return;

    setError("");
    setSuccess("");
    setCancellingId(id);

    try {
      await cancelReservation(id);
      setSuccess(`Đã hủy reservation #${id}.`);

      const updated = await fetchReservations(
        statusFilter === "ALL" ? undefined : statusFilter
      );
      setReservations(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể hủy reservation."
      );
    } finally {
      setCancellingId(null);
    }
  }

  const totalSeats = Math.max(
    0,
    ...seatAvailability.map((seat) => seat.seatNumber)
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "28px 18px",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1150, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              color: primary,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.5,
              marginBottom: 8,
            }}
          >
            SMART CAMPUS FACILITY
          </div>

          <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>
            Study Room Booking
          </h1>

          <p style={{ color: muted, margin: 0, fontSize: 14 }}>
            Chọn phòng, ngày, khung giờ và ghế; theo dõi trạng thái reservation.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: 13,
              marginBottom: 16,
              borderRadius: 8,
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              padding: 13,
              marginBottom: 16,
              borderRadius: 8,
              background: "#dcfce7",
              color: "#166534",
              fontSize: 14,
            }}
          >
            {success}
          </div>
        )}

        <div
          className="booking-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(280px, 0.85fr) minmax(0, 1.4fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <section
            style={{
              background: "#ffffff",
              border: `1px solid ${border}`,
              borderRadius: 14,
              padding: 22,
              minWidth: 0,
            }}
          >
            <h2 style={{ fontSize: 19, margin: "0 0 5px" }}>
              Create Reservation
            </h2>

            <p style={{ color: muted, fontSize: 13, marginBottom: 22 }}>
              Nhập thông tin đặt phòng bên dưới.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 17 }}>
                <label htmlFor="roomId" style={labelStyle}>
                  Room *
                </label>

                <select
                  id="roomId"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  style={inputStyle}
                  required
                  disabled={loading || submitting}
                >
                  <option value="">-- Select room --</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.code} - {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 17 }}>
                <label htmlFor="date" style={labelStyle}>
                  Date *
                </label>

                <input
                  id="date"
                  type="date"
                  min={today()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={inputStyle}
                  required
                  disabled={submitting}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 17,
                }}
              >
                <div>
                  <label htmlFor="startTime" style={labelStyle}>
                    Start time *
                  </label>

                  <select
                    id="startTime"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={inputStyle}
                    required
                    disabled={submitting}
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="endTime" style={labelStyle}>
                    End time *
                  </label>

                  <select
                    id="endTime"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={inputStyle}
                    required
                    disabled={submitting}
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  marginBottom: 20,
                  padding: 14,
                  border: `1px solid ${border}`,
                  borderRadius: 10,
                }}
              >
                <h3 style={{ fontSize: 16, margin: "0 0 12px" }}>
                  Chọn ghế
                </h3>

                {!roomId ? (
                  <p style={{ color: muted, fontSize: 13, margin: 0 }}>
                    Vui lòng chọn phòng để xem sơ đồ ghế.
                  </p>
                ) : seatError ? (
                  <div>
                    <p
                      role="alert"
                      style={{
                        color: "#b91c1c",
                        fontSize: 13,
                        marginTop: 0,
                      }}
                    >
                      {seatError}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setSeatError("");
                        setSeatAvailability([]);
                        setRoomId((current) => current);
                      }}
                      style={{
                        padding: "8px 12px",
                        border: `1px solid ${border}`,
                        borderRadius: 8,
                        background: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      Thử lại bằng cách đổi khung giờ
                    </button>
                  </div>
                ) : seatLoading ? (
                  <p style={{ color: muted, fontSize: 13 }}>
                    Đang tải tình trạng ghế...
                  </p>
                ) : seatAvailability.length === 0 ? (
                  <p style={{ color: muted, fontSize: 13 }}>
                    API chưa trả về dữ liệu ghế cho phòng và thời gian này.
                  </p>
                ) : (
                  <SeatPicker
                    totalSeats={totalSeats}
                    selectedSeats={selectedSeats}
                    unavailableSeats={seatAvailability
                      .filter((seat) => !seat.available)
                      .map((seat) => seat.seatNumber)}
                    onChange={setSelectedSeats}
                    loading={seatLoading || submitting}
                    error={seatError}
                    accentColor={primary}
                  />
                )}

                {selectedSeats.length > 0 && (
                  <p style={{ fontSize: 13, marginBottom: 0 }}>
                    Ghế đã chọn: <strong>{selectedSeats.join(", ")}</strong>
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label htmlFor="note" style={labelStyle}>
                  Note
                </label>

                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập ghi chú đặt phòng..."
                  rows={3}
                  maxLength={500}
                  style={{ ...inputStyle, resize: "vertical" }}
                  disabled={submitting}
                />
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  submitting ||
                  rooms.length === 0 ||
                  seatLoading ||
                  Boolean(seatError)
                }
                style={{
                  width: "100%",
                  padding: 12,
                  border: 0,
                  borderRadius: 8,
                  color: "#ffffff",
                  background: primary,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: submitting || loading ? "wait" : "pointer",
                  opacity:
                    submitting ||
                    loading ||
                    rooms.length === 0 ||
                    seatLoading ||
                    Boolean(seatError)
                      ? 0.6
                      : 1,
                }}
              >
                {submitting ? "Submitting..." : "Confirm Reservation"}
              </button>

              {rooms.length === 0 && !loading && (
                <p style={{ color: muted, fontSize: 12, marginTop: 12 }}>
                  Không có phòng. Hãy kiểm tra API fetchRooms() và Backend.
                </p>
              )}
            </form>
          </section>

          <section
            style={{
              background: "#ffffff",
              border: `1px solid ${border}`,
              borderRadius: 14,
              padding: 22,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              <div>
                <h2 style={{ fontSize: 19, margin: "0 0 5px" }}>
                  Reservation List
                </h2>

                <p style={{ color: muted, fontSize: 13, margin: 0 }}>
                  Trạng thái được lấy trực tiếp từ Backend.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                style={{
                  padding: "9px 12px",
                  border: `1px solid ${border}`,
                  borderRadius: 8,
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label htmlFor="statusFilter" style={labelStyle}>
                Reservation status
              </label>

              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {loading ? (
              <p style={{ color: muted, padding: 20, textAlign: "center" }}>
                Đang tải reservations...
              </p>
            ) : reservations.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  border: `1px dashed ${border}`,
                  borderRadius: 10,
                  color: muted,
                  fontSize: 14,
                }}
              >
                Không có reservation nào trong danh sách này.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {reservations.map((reservation) => {
                  const status = statusInfo(reservation.status);
                  const cancelled =
                    reservation.status.toUpperCase() === "CANCELLED";

                  return (
                    <article
                      key={reservation.id}
                      style={{
                        border: `1px solid ${border}`,
                        borderRadius: 10,
                        padding: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                          marginBottom: 14,
                        }}
                      >
                        <strong>Reservation #{reservation.id}</strong>

                        <span
                          style={{
                            background: status.bg,
                            color: status.color,
                            padding: "6px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 750,
                          }}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: 14,
                          fontSize: 13,
                        }}
                      >
                        <div>
                          <div style={{ color: muted, marginBottom: 5 }}>
                            Room ID
                          </div>
                          <strong>{reservation.roomId}</strong>
                        </div>

                        <div>
                          <div style={{ color: muted, marginBottom: 5 }}>
                            User ID
                          </div>
                          <strong>{reservation.userId}</strong>
                        </div>

                        <div>
                          <div style={{ color: muted, marginBottom: 5 }}>
                            Date
                          </div>
                          <strong>{formatDate(reservation.startTime)}</strong>
                        </div>

                        <div>
                          <div style={{ color: muted, marginBottom: 5 }}>
                            Created at
                          </div>
                          <strong>{formatDateTime(reservation.createdAt)}</strong>
                        </div>

                        <div>
                          <div style={{ color: muted, marginBottom: 5 }}>
                            Start
                          </div>
                          <strong>{formatDateTime(reservation.startTime)}</strong>
                        </div>

                        <div>
                          <div style={{ color: muted, marginBottom: 5 }}>
                            End
                          </div>
                          <strong>{formatDateTime(reservation.endTime)}</strong>
                        </div>
                      </div>

                      {!cancelled && (
                        <div
                          style={{
                            marginTop: 14,
                            paddingTop: 12,
                            borderTop: `1px solid ${border}`,
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => void handleCancel(reservation.id)}
                            disabled={cancellingId === reservation.id}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 8,
                              border: "1px solid #fecaca",
                              background: "#fff1f2",
                              color: "#be123c",
                              fontWeight: 650,
                              cursor: "pointer",
                            }}
                          >
                            {cancellingId === reservation.id
                              ? "Cancelling..."
                              : "Cancel reservation"}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .booking-layout {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
