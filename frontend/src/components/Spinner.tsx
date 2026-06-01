// Styles
import styles from "./Spinner.module.scss";

const VIEW_BOX_SIZE = 100;

interface SpinnerProps {
    readonly size?: string | number;
    readonly circleWidth?: number;
    readonly mountDelayMs?: number;
}

export default function Spinner({
    size = "1rem",
    circleWidth = 8,
    mountDelayMs = 0,
}: SpinnerProps) {
    return (
        <div className={styles.container}>
            <svg
                viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
                style={
                    {
                        width: size,
                        height: size,
                        "--mount-delay-ms": `${mountDelayMs}ms`,
                    } as React.CSSProperties
                }
            >
                <circle
                    cx={VIEW_BOX_SIZE / 2}
                    cy={VIEW_BOX_SIZE / 2}
                    r={VIEW_BOX_SIZE / 2 - circleWidth / 2}
                    strokeWidth={circleWidth}
                    fill="none"
                    strokeMiterlimit="10"
                />
            </svg>
        </div>
    );
}
