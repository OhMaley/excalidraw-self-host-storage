// Hooks
import { useNavigate } from "react-router-dom";

// Styles
import styles from "./AccessDenied.module.scss";

interface AccessDeniedProps {
    requiresRoleAmong?: string[];
}

export default function AccessDenied({ requiresRoleAmong }: AccessDeniedProps) {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            {/* Image */}
            <div className={styles.image} />

            {/* Status code */}
            <div className={styles.statusCode}>403</div>

            {/* Heading */}
            <div className={styles.heading}>Access Denied</div>

            {/* Description */}
            <p className={styles.description}>
                {requiresRoleAmong && requiresRoleAmong.length > 0 ? (
                    <>
                        To view the content of this page, you must be granted at least one of the
                        following roles:
                        <strong> {requiresRoleAmong.join(", ")}</strong>.
                    </>
                ) : (
                    <>You do not have sufficient permissions to view this page.</>
                )}
            </p>

            {/* Navigation button */}
            <button type="button" className={styles.button} onClick={() => void navigate(-1)}>
                Go Back
            </button>
        </div>
    );
}
