import { useEffect } from "react";

// Components
import { UserDropdownMenu } from "./UserDropdownMenu";

// Hooks
import { useAuth } from "@hooks/useAuth";
import { useToast } from "@hooks/useToast";

export function TopRightUI() {
    const { loading, isAuthenticated, user, login, logout, error } = useAuth();
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

    if (loading || error) return null;

    if (isAuthenticated && user) {
        return <UserDropdownMenu user={user} logout={logout} />;
    }

    return <button onClick={() => login()}>Login</button>;
}
