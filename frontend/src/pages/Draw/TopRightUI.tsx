import { useEffect } from "react";

// Components
import { UserDropdownMenu } from "./UserDropdownMenu";
import LibraryIcon from "@assets/icons/library.svg?react";

// Hooks
import { useAuth } from "@hooks/useAuth";
import { useToast } from "@hooks/useToast";

// Types
import type { User } from "@contexts/AuthContext";

import styles from "./TopRightUI.module.scss";

interface TopRightUIProps {
    readonly onToggleLibrary: () => void;
    readonly isLibraryOpen: boolean;
}

interface AuthControlProps {
    readonly loading: boolean;
    readonly error: Error | null;
    readonly user: User | null;
    readonly login: () => void;
    readonly logout: () => void;
}

function AuthControl({ loading, error, user, login, logout }: AuthControlProps) {
    if (loading || error) return null;
    if (user) return <UserDropdownMenu user={user} logout={logout} />;
    return <button onClick={() => login()}>Login</button>;
}

export function TopRightUI({ onToggleLibrary, isLibraryOpen }: TopRightUIProps) {
    const { loading, user, login, logout, error } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        if (!error) return;
        console.error("[Auth] Keycloak initialization failed:", error);
        showToast({
            title: "Authentication unavailable",
            description: "Could not connect to the authentication service.",
            variant: "warning",
        });
    }, [error, showToast]);

    return (
        <div className={styles.container}>
            <AuthControl
                loading={loading}
                error={error}
                user={user}
                login={login}
                logout={logout}
            />
            <button
                className={styles.libraryButton}
                onClick={onToggleLibrary}
                title={isLibraryOpen ? "Close library" : "Open library"}
                aria-pressed={isLibraryOpen}
            >
                <LibraryIcon />
            </button>
        </div>
    );
}
