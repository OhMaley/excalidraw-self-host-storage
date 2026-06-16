import { useEffect, useRef, lazy, Suspense } from "react";

// Components
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@hooks/useAuth";
import { Spinner } from "@components/Spinner";

// Components
const AuthError = lazy(() => import("@components/ErrorPages/AuthError"));

export const RequireAuth = () => {
    const { loading, isAuthenticated, error, login } = useAuth();
    const location = useLocation();
    const loginTriggered = useRef(false);

    // Trigger login only when keycloak is initialized properly
    useEffect(() => {
        if (loading || error) return;

        if (!isAuthenticated && !loginTriggered.current) {
            loginTriggered.current = true;

            login(window.location.origin + location.pathname + location.search);
        }
    }, [loading, isAuthenticated, error, login, location]);

    // Keycloak down
    if (error) {
        return (
            <Suspense fallback={null}>
                <AuthError />
            </Suspense>
        );
    }

    // Still initializing
    if (loading) {
        return <Spinner size="2rem" mountDelayMs={2000} />;
    }

    // No active SSO session
    if (!isAuthenticated) {
        return null;
    }

    // Correctly authenticated
    return <Outlet />;
};
