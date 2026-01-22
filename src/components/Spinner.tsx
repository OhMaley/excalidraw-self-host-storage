// Styles
import styles from "./Spinner.module.scss";

interface SpinnerProps {
    size?: string | number;
    circleWidth?: number;
    mountDelayMs?: number;
}

export default function Spinner({
    size = "1rem",
    circleWidth = 8,
    mountDelayMs = 0,
}: SpinnerProps) {
    return (
        <div className={styles.container}>
            <svg
                viewBox="0 0 100 100"
                style={
                    {
                        width: size,
                        height: size,
                        "--mount-delay-ms": `${mountDelayMs}ms`,
                    } as React.CSSProperties
                }
            >
                <circle
                    cx="50"
                    cy="50"
                    r={50 - circleWidth / 2}
                    strokeWidth={circleWidth}
                    fill="none"
                    strokeMiterlimit="10"
                />
            </svg>
        </div>
    );
}
