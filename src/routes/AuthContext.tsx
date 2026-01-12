import { createContext, useEffect, useState, useCallback, useRef } from "react";

// Components
import Keycloak from "keycloak-js";

const ROLES = ["user", "admin"] as const;
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
    isAuthenticated: boolean;
    login: (redirectUri?: string) => void;
    logout: () => void;
    hasRole: (roles: Role[]) => boolean;
}

export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const kc = new Keycloak({
            url: import.meta.env.VITE_KEYCLOAK_URL,
            realm: import.meta.env.VITE_KEYCLOAK_REALM,
            clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        });

        kc.init({
            onLoad: "check-sso",
            checkLoginIframe: true,
            pkceMethod: "S256",
            silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
            silentCheckSsoFallback: false,
        })
            .then((authenticated) => {
                setKeycloak(kc);

                if (authenticated && kc.tokenParsed) {
                    localStorage.setItem("was_authenticated", "true");

                    const token = kc.tokenParsed as {
                        sub: string;
                        preferred_username?: string;
                        email?: string;
                        resource_access?: Record<string, { roles: string[] }>;
                    };

                    const rawRoles: string[] =
                        token.resource_access?.[import.meta.env.VITE_KEYCLOAK_CLIENT_ID]?.roles ??
                        [];
                    const roles: Role[] = rawRoles.filter((r): r is Role =>
                        ROLES.includes(r as Role)
                    );

                    setUser({
                        id: token.sub,
                        name: token.preferred_username ?? "User",
                        email: token.email,
                        roles,
                    });
                } else {
                    setUser(null);
                }

                setLoading(false);
            })
            .catch(() => {
                setUser(null);
                setLoading(false);
            });
    }, []);

    const login = useCallback(
        (redirectUri?: string) => {
            if (!keycloak) return;

            void keycloak?.login({
                redirectUri: redirectUri ?? window.location.href,
            });
        },
        [keycloak]
    );

    const logout = useCallback(() => {
        if (!keycloak) return;

        void keycloak?.logout({ redirectUri: window.location.origin });
        setUser(null);
    }, [keycloak]);

    const hasRole = useCallback(
        (roles: Role[]) => !!user && user.roles.some((r) => roles.includes(r)),
        [user]
    );

    const value: AuthContextType = {
        keycloak,
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
