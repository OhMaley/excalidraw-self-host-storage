import { createContext, useCallback } from "react";

// Components
import Keycloak from "keycloak-js";

// Hooks
import { useKeycloakInit } from "@hooks/useKeycloakInit";

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

export interface User {
    id: string;
    name: string;
    email?: string;
    roles: Role[];
}

export interface AuthContextType {
    keycloak: Keycloak | null;
    user: User | null;
    loading: boolean;
    error: Error | null;
    isAuthenticated: boolean;
    login: (redirectUri?: string) => void;
    logout: () => void;
    hasRole: (roles: Role[]) => boolean;
}

export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { readonly children: React.ReactNode }) {
    const { keycloak, user, loading, error } = useKeycloakInit();

    const login = useCallback(
        (redirectUri?: string) => {
            if (!keycloak) return;
            void keycloak.login({ redirectUri: redirectUri ?? window.location.href });
        },
        [keycloak]
    );

    const logout = useCallback(() => {
        if (!keycloak) return;
        void keycloak.logout({ redirectUri: window.location.origin });
    }, [keycloak]);

    const hasRole = useCallback(
        (roles: Role[]) => !!user && user.roles.some((r) => roles.includes(r)),
        [user]
    );

    const value: AuthContextType = {
        keycloak,
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
