// Components
import { Outlet } from "react-router-dom";
import { useAuth } from "@hooks/useAuth";
import AccessDenied from "@pages/AccessDenied";

// Types
import type { Role } from "@routes/AuthContext";

interface RequireRoleProps {
    requiresRoleAmong: Role[];
}

export const RequireRole = ({ requiresRoleAmong }: RequireRoleProps) => {
    const { loading, hasRole } = useAuth();

    if (loading) return;

    if (!hasRole(requiresRoleAmong)) {
        return <AccessDenied requiresRoleAmong={requiresRoleAmong} />;
    }

    return <Outlet />;
};
