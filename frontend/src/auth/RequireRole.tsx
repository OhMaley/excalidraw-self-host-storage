import { lazy, Suspense } from "react";

// Components
import { Outlet } from "react-router-dom";
import { useAuth } from "@hooks/useAuth";

// Types
import type { Role } from "@contexts/AuthContext";

const AccessDenied = lazy(() => import("@components/ErrorPages/AccessDenied"));

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
