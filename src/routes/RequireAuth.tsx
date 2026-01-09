import { useEffect, useRef } from "react";

// Components
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@hooks/useAuth";

export const RequireAuth = () => {
    const { loading, isAuthenticated, login } = useAuth();
    const location = useLocation();
    const loginTriggered = useRef(false);

    // Wait for Keycloak init
    useEffect(() => {
        if (loading) return;

        if (!isAuthenticated && !loginTriggered.current) {
            loginTriggered.current = true;

            login(window.location.origin + location.pathname + location.search);
        }
    }, [loading, isAuthenticated, login, location]);

    if (!isAuthenticated) {
        return null;
    }

    return <Outlet />;
};
