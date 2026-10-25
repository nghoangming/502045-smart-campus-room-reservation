
import React from "react";

export type SeatPickerProps = {
    totalSeats: number;
    selectedSeats: number[];
    unavailableSeats?: number[];
    onChange: (seats: number[]) => void;
    accentColor?: string;
    loading?: boolean;
    error?: string;
    maxSelectable?: number;
};

export default function SeatPicker({
    totalSeats,
    selectedSeats,
    unavailableSeats = [],
    onChange,
    accentColor = "#0d9488",
    loading = false,
    error = "",
    maxSelectable,
}: SeatPickerProps) {
    const unavailable = new Set(unavailableSeats);

    function toggleSeat(seatNumber: number) {
        if (loading || unavailable.has(seatNumber)) {
            return;
        }

        if (selectedSeats.includes(seatNumber)) {
            onChange(
                selectedSeats.filter(
                    (seat) => seat !== seatNumber
                )
            );
            return;
        }

        if (
            maxSelectable !== undefined &&
            selectedSeats.length >= maxSelectable
        ) {
            return;
        }

        onChange(
            [...selectedSeats, seatNumber].sort(
                (a, b) => a - b
            )
        );
    }

    function getSeatStyle(seatNumber: number): React.CSSProperties {
        const isUnavailable = unavailable.has(seatNumber);
        const isSelected = selectedSeats.includes(seatNumber);
        const reachedLimit =
            maxSelectable !== undefined &&
            selectedSeats.length >= maxSelectable;

        const disabled =
            isUnavailable ||
            loading ||
            (!isSelected && reachedLimit);

        return {
            width: "48px",
            height: "44px",
            borderRadius: "10px",
            border: isSelected
                ? `2px solid ${accentColor}`
                : "1px solid #d1d5db",
            background: isUnavailable
                ? "#e5e7eb"
                : isSelected
                ? accentColor
                : "#dcfce7",
            color: isUnavailable
                ? "#6b7280"
                : isSelected
                ? "#ffffff"
                : "#166534",
            fontSize: "14px",
            fontWeight: 700,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "all 0.15s ease",
        };
    }

    const availableCount = Math.max(0, totalSeats) -
        new Set(
            unavailableSeats.filter(
                (seat) => seat >= 1 && seat <= totalSeats
            )
        ).size;

    return (
        <section
            style={{
                marginTop: "20px",
                padding: "18px",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                background: "#ffffff",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginBottom: "14px",
                }}
            >
                <div>
                    <h3
                        style={{
                            margin: "0 0 5px",
                            fontSize: "17px",
                            color: "#111827",
                        }}
                    >
                        Chọn ghế
                    </h3>

                    <p
                        style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#6b7280",
                        }}
                    >
                        Chọn ghế theo số người tham gia
                    </p>
                </div>

                <span
                    style={{
                        padding: "6px 10px",
                        borderRadius: "20px",
                        background: "#f0fdfa",
                        color: "#0f766e",
                        fontSize: "12px",
                        fontWeight: 700,
                    }}
                >
                    {selectedSeats.length}
                    {maxSelectable !== undefined
                        ? ` / ${maxSelectable}`
                        : ""}
                    {" "}ghế
                </span>
            </div>

            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginBottom: "20px",
                    fontSize: "12px",
                    color: "#4b5563",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}
                >
                    <span
                        style={{
                            width: "13px",
                            height: "13px",
                            borderRadius: "4px",
                            background: "#dcfce7",
                            border: "1px solid #86efac",
                        }}
                    />
                    Ghế trống
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}
                >
                    <span
                        style={{
                            width: "13px",
                            height: "13px",
                            borderRadius: "4px",
                            background: accentColor,
                        }}
                    />
                    Đang chọn
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                    }}
                >
                    <span
                        style={{
                            width: "13px",
                            height: "13px",
                            borderRadius: "4px",
                            background: "#e5e7eb",
                            border: "1px solid #d1d5db",
                        }}
                    />
                    Không khả dụng
                </div>
            </div>

            {loading && (
                <p
                    role="status"
                    style={{
                        padding: "12px",
                        borderRadius: "8px",
                        background: "#f3f4f6",
                        color: "#4b5563",
                        fontSize: "13px",
                    }}
                >
                    Đang tải trạng thái ghế...
                </p>
            )}

            {error && (
                <p
                    role="alert"
                    style={{
                        padding: "12px",
                        borderRadius: "8px",
                        background: "#fef2f2",
                        color: "#b91c1c",
                        fontSize: "13px",
                        lineHeight: 1.5,
                    }}
                >
                    {error}
                </p>
            )}

            {!loading && !error && (
                <>
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "300px",
                            margin: "0 auto 22px",
                            padding: "9px",
                            textAlign: "center",
                            borderRadius: "8px",
                            background: "#f3f4f6",
                            color: "#6b7280",
                            fontSize: "11px",
                            fontWeight: 700,
                            letterSpacing: "2px",
                        }}
                    >
                        PHÍA TRƯỚC PHÒNG
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(4, minmax(0, 48px))",
                            gap: "12px",
                            justifyContent: "center",
                        }}
                    >
                        {Array.from(
                            {
                                length: Math.max(
                                    0,
                                    Math.floor(totalSeats)
                                ),
                            },
                            (_, index) => index + 1
                        ).map((seatNumber) => {
                            const isUnavailable =
                                unavailable.has(seatNumber);

                            const isSelected =
                                selectedSeats.includes(seatNumber);

                            const reachedLimit =
                                maxSelectable !== undefined &&
                                selectedSeats.length >= maxSelectable;

                            const disabled =
                                isUnavailable ||
                                loading ||
                                (!isSelected && reachedLimit);

                            return (
                                <button
                                    key={seatNumber}
                                    type="button"
                                    style={getSeatStyle(seatNumber)}
                                    disabled={disabled}
                                    aria-pressed={isSelected}
                                    aria-label={
                                        `Ghế ${seatNumber}` +
                                        (isUnavailable
                                            ? ", không khả dụng"
                                            : "")
                                    }
                                    onClick={() =>
                                        toggleSeat(seatNumber)
                                    }
                                    title={
                                        isUnavailable
                                            ? "Ghế không khả dụng"
                                            : isSelected
                                            ? "Bỏ chọn ghế"
                                            : reachedLimit
                                            ? "Đã chọn đủ số ghế"
                                            : "Chọn ghế này"
                                    }
                                >
                                    {seatNumber}
                                </button>
                            );
                        })}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "8px",
                            marginTop: "20px",
                            paddingTop: "14px",
                            borderTop: "1px solid #e5e7eb",
                            fontSize: "13px",
                        }}
                    >
                        <span style={{ color: "#6b7280" }}>
                            Ghế còn trống
                        </span>

                        <strong style={{ color: "#166534" }}>
                            {availableCount}
                        </strong>
                    </div>

                    <p
                        style={{
                            margin: "12px 0 0",
                            fontSize: "13px",
                            lineHeight: 1.6,
                            color: "#374151",
                            overflowWrap: "anywhere",
                        }}
                    >
                        <strong>Ghế đang chọn: </strong>
                        {selectedSeats.length > 0
                            ? [...selectedSeats]
                                  .sort((a, b) => a - b)
                                  .join(", ")
                            : "Chưa chọn ghế"}
                    </p>

                    {maxSelectable !== undefined &&
                        selectedSeats.length < maxSelectable && (
                            <p
                                style={{
                                    margin: "8px 0 0",
                                    fontSize: "12px",
                                    color: "#b45309",
                                }}
                            >
                                Bạn cần chọn thêm{" "}
                                {maxSelectable - selectedSeats.length} ghế.
                            </p>
                        )}
                </>
            )}
        </section>
    );
}
