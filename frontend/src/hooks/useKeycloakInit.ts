import { useEffect, useState, useRef, type RefObject } from "react";

// Components
import Keycloak from "keycloak-js";

// Services
import { setKeycloak as registerKeycloak } from "@services/api";

// Contexts
import { ROLES, type Role, type User } from "@contexts/AuthContext";

interface TokenParsed {
    sub: string;
    name?: string;
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
        name: token.name ?? token.preferred_username ?? "User",
        email: token.email,
        roles,
    };
}

// Keep the access token refreshed well before it actually expires.
const REFRESH_MIN_VALIDITY_SECONDS = 30;
// Retry a failed refresh with backoff while it still looks like a transient
// (network) problem, capped so we don't hammer Keycloak.
const REFRESH_RETRY_BASE_DELAY_MS = 5000;
const REFRESH_RETRY_MAX_DELAY_MS = 60000;
// Consecutive refresh failures *while the browser reports being online* before
// we give up retrying silently and conclude the session itself is dead
// (refresh token expired/revoked) rather than the network being flaky.
const MAX_CONSECUTIVE_REFRESH_FAILURES = 3;

// "active": token valid (or was just refreshed). "reconnecting": a refresh
// attempt failed and is being retried automatically — likely a network blip.
// "expired": repeated refresh failures while online — the session is dead and
// the user needs to sign in again; nothing will self-heal from here.
export type SessionStatus = "active" | "reconnecting" | "expired";

interface ProactiveRefreshDeps {
    kc: Keycloak;
    retryTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
    consecutiveFailuresRef: RefObject<number>;
    setSessionStatus: (status: SessionStatus) => void;
    setUser: (user: User | null) => void;
}

// Wires kc.onTokenExpired/onAuthRefreshSuccess/onAuthRefreshError so the token
// is refreshed proactively (via keycloak-js's own internal expiry timer)
// instead of only lazily on the next outgoing API call, with backoff retry on
// failure and a distinction between "transient" and "the session is dead".
function setupProactiveRefresh({
    kc,
    retryTimerRef,
    consecutiveFailuresRef,
    setSessionStatus,
    setUser,
}: ProactiveRefreshDeps): void {
    const attemptRefresh = () => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        kc.updateToken(REFRESH_MIN_VALIDITY_SECONDS).catch(() => {
            // onAuthRefreshError (registered below) handles the state transition.
        });
    };

    // keycloak-js calls this on its own internal timer, right as the access
    // token is about to expire — this is what makes refresh proactive instead
    // of only happening lazily on the next outgoing API call.
    kc.onTokenExpired = () => {
        setSessionStatus("reconnecting");
        attemptRefresh();
    };

    kc.onAuthRefreshSuccess = () => {
        consecutiveFailuresRef.current = 0;
        setSessionStatus("active");
        setUser(parseUserFromToken(kc));
    };

    kc.onAuthRefreshError = () => {
        consecutiveFailuresRef.current += 1;
        const looksLikeDeadSession =
            navigator.onLine && consecutiveFailuresRef.current >= MAX_CONSECUTIVE_REFRESH_FAILURES;

        if (looksLikeDeadSession) {
            setSessionStatus("expired");
            return;
        }

        setSessionStatus("reconnecting");
        const delay = Math.min(
            REFRESH_RETRY_BASE_DELAY_MS * 2 ** (consecutiveFailuresRef.current - 1),
            REFRESH_RETRY_MAX_DELAY_MS
        );
        retryTimerRef.current = setTimeout(attemptRefresh, delay);
    };
}

export function useKeycloakInit() {
    const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [sessionStatus, setSessionStatus] = useState<SessionStatus>("active");
    const initializedRef = useRef(false);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const consecutiveFailuresRef = useRef(0);
    const kcRef = useRef<Keycloak | null>(null);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        const kc = new Keycloak({
            url: import.meta.env.VITE_KEYCLOAK_URL,
            realm: import.meta.env.VITE_KEYCLOAK_REALM,
            clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        });
        kcRef.current = kc;

        setupProactiveRefresh({
            kc,
            retryTimerRef,
            consecutiveFailuresRef,
            setSessionStatus,
            setUser,
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

        // No cleanup here: this effect is guarded to run its body at most once
        // (initializedRef) specifically so it survives React StrictMode's
        // dev-mode double-invoke without creating a second Keycloak instance.
        // A cleanup paired with that guard would only ever run after the
        // *real* mount and never get a matching re-run to restore what it
        // tore down. Teardown-needing listeners live in a separate effect below.
    }, []);

    // Split from the init effect above so this one gets proper StrictMode
    // mount → cleanup → mount semantics (it only touches a DOM listener, not
    // the Keycloak instance, so re-running it is harmless).
    useEffect(() => {
        const onOnline = () => {
            const kc = kcRef.current;
            if (kc?.authenticated) {
                kc.updateToken(REFRESH_MIN_VALIDITY_SECONDS).catch(() => {
                    // onAuthRefreshError handles the state transition.
                });
            }
        };
        window.addEventListener("online", onOnline);
        // Not clearing retryTimerRef here too: it's owned by setupProactiveRefresh's
        // own retry loop (which always clears any pending timer before scheduling
        // the next one), not by this listener — and this provider effectively never
        // unmounts (it wraps the whole app), so there's nothing to leak in practice.
        return () => window.removeEventListener("online", onOnline);
    }, []);

    return { keycloak, user, loading, error, sessionStatus };
}
