// Hooks
import { useNavigate } from "react-router-dom";

// Styles
import styles from "./NotFound.module.scss";

interface NotFoundProps {
    readonly description?: string;
}

export default function NotFound({ description }: NotFoundProps) {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            {/* Image */}
            <div className={styles.image} />

            {/* Status code */}
            <div className={styles.statusCode}>404</div>

            {/* Heading */}
            <div className={styles.heading}>Not Found</div>

            {/* Description */}
            <p className={styles.description}>
                {description ? <>{description}</> : <>This page does not exist.</>}
            </p>

            {/* Navigation button */}
            <button type="button" className="btn-lg" onClick={() => void navigate(-1)}>
                Go Back
            </button>
        </div>
    );
}
