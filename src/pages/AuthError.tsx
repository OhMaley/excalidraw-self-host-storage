// Hooks
import { useNavigate } from "react-router-dom";

// Styles
import styles from "./AuthError.module.scss";

export default function AuthError() {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            {/* Image */}
            <div className={styles.image} />

            {/* Status code */}
            <div className={styles.statusCode}>503</div>

            {/* Heading */}
            <div className={styles.heading}>Authentication Service Unavailable</div>

            {/* Description */}
            <p className={styles.description}>
                The authentication service is temporarily unavailable. Please try again in a few
                moments.
            </p>

            {/* Navigation button */}
            <button type="button" className={styles.button} onClick={() => void navigate(-1)}>
                Go Back
            </button>
        </div>
    );
}
