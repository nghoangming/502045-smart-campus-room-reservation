type Status = "Available" | "Reserved" | "Loading";

type StatusBadgeProps = {
    status: Status;
    label?: string;
};

const statusStyles: Record<
    Status,
    { background: string; color: string; label: string }
> = {
    Available: {
        background: "#DCFCE7",
        color: "#15803D",
        label: "Available",
    },
    Reserved: {
        background: "#FEE2E2",
        color: "#B91C1C",
        label: "Reserved",
    },
    Loading: {
        background: "#FEF3C7",
        color: "#B45309",
        label: "Loading...",
    },
};

function StatusBadge({ status, label }: StatusBadgeProps) {
    const style = statusStyles[status];

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "5px 10px",
                borderRadius: "20px",
                backgroundColor: style.background,
                color: style.color,
                fontSize: "12px",
                fontWeight: 600,
                whiteSpace: "nowrap",
            }}
        >
            {status === "Loading" ? "⏳ " : ""}
            {label ?? style.label}
        </span>
    );
}

export default StatusBadge;