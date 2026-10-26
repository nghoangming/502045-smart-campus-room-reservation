
import { useState } from "react";
import SeatPicker from "./SeatPicker";

function SeatPickerPage() {
    const [selectedSeats, setSelectedSeats] = useState<number[]>([
        1, 2, 3, 4,
    ]);

    const [totalSeats, setTotalSeats] = useState(8);

    return (
        <div
            style={{
                minHeight: "100vh",
                padding: "30px",
                background: "#f5f7fb",
                fontFamily: "Arial, sans-serif",
                color: "#111827",
            }}
        >
            <div
                style={{
                    maxWidth: "800px",
                    margin: "0 auto",
                    padding: "24px",
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                }}
            >
                <h1 style={{ marginTop: 0 }}>
                    Sơ đồ chọn ghế
                </h1>

                <p style={{ color: "#6b7280" }}>
                    Chọn số ghế bạn muốn sử dụng.
                </p>

                <div style={{ marginBottom: "20px" }}>
                    <label
                        style={{
                            display: "block",
                            marginBottom: "8px",
                            fontWeight: 600,
                        }}
                    >
                        Sức chứa phòng
                    </label>

                    <select
                        value={totalSeats}
                        onChange={(event) => {
                            const capacity = Number(event.target.value);
                            setTotalSeats(capacity);
                            setSelectedSeats((previous) =>
                                previous.filter(
                                    (seat) => seat <= capacity
                                )
                            );
                        }}
                        style={{
                            padding: "10px",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                        }}
                    >
                        <option value={8}>8 ghế</option>
                        <option value={10}>10 ghế</option>
                        <option value={12}>12 ghế</option>
                    </select>
                </div>

                <SeatPicker
                    totalSeats={totalSeats}
                    selectedSeats={selectedSeats}
                    unavailableSeats={[]}
                    accentColor="#0d9488"
                    onChange={setSelectedSeats}
                />

                <p style={{ marginTop: "20px" }}>
                    <strong>Số ghế đã chọn:</strong>{" "}
                    {selectedSeats.length}
                </p>

                <p>
                    <strong>Danh sách ghế:</strong>{" "}
                    {selectedSeats.length > 0
                        ? [...selectedSeats]
                              .sort((a, b) => a - b)
                              .join(", ")
                        : "Chưa chọn ghế"}
                </p>
            </div>
        </div>
    );
}

export default SeatPickerPage;
