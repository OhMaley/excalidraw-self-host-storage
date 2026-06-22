import styles from "./DrawSaveBanner.module.scss";

interface DrawSaveBannerProps {
    readonly isAuthenticated: boolean;
    readonly authLoading: boolean;
    readonly onSignIn: () => void;
    readonly onSaveToCollection: () => void;
}

export function DrawSaveBanner({
    isAuthenticated,
    authLoading,
    onSignIn,
    onSaveToCollection,
}: DrawSaveBannerProps) {
    if (authLoading) return null;

    return (
        <div className={styles.banner}>
            {isAuthenticated ? (
                <button className={styles.button} onClick={onSaveToCollection}>
                    Save to collection
                </button>
            ) : (
                <button className={styles.button} onClick={onSignIn}>
                    Sign in to save your work
                </button>
            )}
        </div>
    );
}
