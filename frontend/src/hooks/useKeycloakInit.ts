import { useEffect, useState, useRef } from "react";

// Components
import Keycloak from "keycloak-js";

// Services
import { setKeycloak as registerKeycloak } from "@services/api";

// Contexts
import { ROLES, type Role, type User } from "@contexts/AuthContext";

interface TokenParsed {
    sub: string;
    preferred_username?: string;
    email?: string;
    resource_access?: Record<string, { roles: string[] }>;
}

function parseUserFromToken(kc: Keycloak): User | null {
    if (!kc.tokenParsed) return null;
    const token = kc.tokenParsed as TokenParsed;
    const rawRoles: string[] =
        token.resource_access?.[import.meta.env.VITE_KEYCLOAK_CLIENT_ID]?.roles ?? [];
    const roles: Role[] = rawRoles.filter((r): r is Role => ROLES.includes(r as Role));
    return {
        id: token.sub,
        name: token.preferred_username ?? "User",
        email: token.email,
        roles,
    };
}

export function useKeycloakInit() {
    const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
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
                registerKeycloak(kc);
                setError(null);
                setUser(authenticated ? parseUserFromToken(kc) : null);
            })
            .catch((err: unknown) => {
                setUser(null);
                setKeycloak(null);
                setError(
                    err instanceof Error ? err : new Error("Authentication server unreachable")
                );
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    return { keycloak, user, loading, error };
}
