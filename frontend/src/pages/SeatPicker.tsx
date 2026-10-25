
import type { CSSProperties } from "react";

export type SeatPickerProps = {
    totalSeats: number;
    selectedSeats: number[];
    unavailableSeats?: number[];
    onChange: (seats: number[]) => void;
    accentColor?: string;
};

function SeatPicker({
    totalSeats,
    selectedSeats,
    unavailableSeats = [],
    onChange,
    accentColor = "#2563eb",
}: SeatPickerProps) {
    const seats = Array.from(
        { length: totalSeats },
        (_, index) => index + 1
    );

    const unavailable = new Set(unavailableSeats);
    const selected = new Set(selectedSeats);

    const toggleSeat = (seat: number) => {
        if (unavailable.has(seat)) {
            return;
        }

        if (selected.has(seat)) {
            onChange(selectedSeats.filter((item) => item !== seat));
        } else {
            onChange(
                [...selectedSeats, seat].sort((a, b) => a - b)
            );
        }
    };

    const seatButtonStyle = (seat: number): CSSProperties => {
        const isUnavailable = unavailable.has(seat);
        const isSelected = selected.has(seat);

        return {
            minWidth: "38px",
            height: "36px",
            borderRadius: "8px",
            border: `1px solid ${
                isUnavailable
                    ? "#d1d5db"
                    : isSelected
                    ? accentColor
                    : "#cbd5e1"
            }`,
            background: isUnavailable
                ? "#e5e7eb"
                : isSelected
                ? accentColor
                : "#ffffff",
            color: isUnavailable
                ? "#9ca3af"
                : isSelected
                ? "#ffffff"
                : "#374151",
            fontSize: "12px",
            fontWeight: 700,
            cursor: isUnavailable ? "not-allowed" : "pointer",
            opacity: isUnavailable ? 0.7 : 1,
        };
    };

    return (
        <div
            style={{
                marginBottom: "18px",
                padding: "14px",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                background: "#f8fafc",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginBottom: "12px",
                }}
            >
                <strong style={{ fontSize: "14px", color: "#1f2937" }}>
                    Chọn chỗ ngồi
                </strong>

                <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Đã chọn: {selectedSeats.length}
                </span>
            </div>

            <div
                style={{
                    padding: "7px",
                    textAlign: "center",
                    borderRadius: "6px",
                    background: "#e2e8f0",
                    color: "#475569",
                    fontSize: "11px",
                    fontWeight: 700,
                    marginBottom: "14px",
                    letterSpacing: "1px",
                }}
            >
                PHÍA BẢNG / MÀN HÌNH
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    gap: "8px",
                    justifyItems: "center",
                }}
            >
                {seats.map((seat) => (
                    <button
                        key={seat}
                        type="button"
                        onClick={() => toggleSeat(seat)}
                        disabled={unavailable.has(seat)}
                        aria-pressed={selected.has(seat)}
                        aria-label={`Ghế ${seat}${
                            unavailable.has(seat)
                                ? " đã được đặt"
                                : selected.has(seat)
                                ? " đang chọn"
                                : " còn trống"
                        }`}
                        title={
                            unavailable.has(seat)
                                ? "Ghế đã được đặt"
                                : selected.has(seat)
                                ? "Bỏ chọn ghế này"
                                : "Chọn ghế này"
                        }
                        style={seatButtonStyle(seat)}
                    >
                        {seat}
                    </button>
                ))}
            </div>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginTop: "14px",
                    fontSize: "11px",
                    color: "#475569",
                }}
            >
                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                    }}
                >
                    <span
                        style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "3px",
                            background: accentColor,
                        }}
                    />
                    Đang chọn
                </span>

                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                    }}
                >
                    <span
                        style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "3px",
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                        }}
                    />
                    Còn trống
                </span>

                <span
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                    }}
                >
                    <span
                        style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "3px",
                            background: "#e5e7eb",
                        }}
                    />
                    Đã được đặt
                </span>
            </div>

            {selectedSeats.length === 0 && (
                <p
                    style={{
                        margin: "10px 0 0",
                        color: "#b91c1c",
                        fontSize: "12px",
                    }}
                >
                    Vui lòng chọn ít nhất một chỗ ngồi.
                </p>
            )}
        </div>
    );
}

export default SeatPicker;
