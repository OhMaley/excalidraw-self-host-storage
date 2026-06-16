import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ErrorPage.module.scss";

interface ErrorPageProps {
    readonly imageClassName: string;
    readonly statusCode: string;
    readonly heading: string;
    readonly description: ReactNode;
}

export function ErrorPage({ imageClassName, statusCode, heading, description }: ErrorPageProps) {
    const navigate = useNavigate();
    return (
        <div className={styles.container}>
            <div className={imageClassName} />
            <div className={styles.statusCode}>{statusCode}</div>
            <div className={styles.heading}>{heading}</div>
            <p className={styles.description}>{description}</p>
            <button type="button" className="btn-lg" onClick={() => void navigate(-1)}>
                Go Back
            </button>
        </div>
    );
}
