import { lazy, Suspense } from "react";

// Components
import { Outlet } from "react-router-dom";
import { useAuth } from "@hooks/useAuth";

// Types
import type { Role } from "@auth/AuthContext";

const AccessDenied = lazy(() => import("@pages/AccessDenied"));

interface RequireRoleProps {
    requiresRoleAmong: Role[];
}

export const RequireRole = ({ requiresRoleAmong }: RequireRoleProps) => {
    const { loading, hasRole } = useAuth();

    if (loading) return null;

    if (!hasRole(requiresRoleAmong)) {
        return (
            <Suspense fallback={null}>
                <AccessDenied requiresRoleAmong={requiresRoleAmong} />
            </Suspense>
        );
    }

    return <Outlet />;
};
