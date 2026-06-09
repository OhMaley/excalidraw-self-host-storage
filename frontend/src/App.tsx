import { Suspense } from "react";

// Components
import { Routes, Route, Navigate } from "react-router-dom";
import Spinner from "@components/Spinner";
import { AppLayout } from "@components/AppLayout";

// Auth guards
import { RequireAuth } from "@auth/RequireAuth";
import { RequireRole } from "@auth/RequireRoles";

// Routes
import { publicRoutes, fullscreenRoutes, adminRoutes, shellRoutes } from "./routes";

function App() {
    return (
        <Suspense fallback={<Spinner size="3rem" mountDelayMs={150} />}>
            <Routes>
                {/* Public — no auth */}
                {publicRoutes.map(({ path, element: E }) => (
                    <Route key={path} path={path} element={<E />} />
                ))}

                {/* Auth required */}
                <Route element={<RequireAuth />}>
                    {/* Full-screen — no shell (draw, dashboard) */}
                    {fullscreenRoutes.map(({ path, element: E }) => (
                        <Route key={path} path={path} element={<E />} />
                    ))}

                    {/* Admin only */}
                    <Route element={<RequireRole requiresRoleAmong={["admin"]} />}>
                        {adminRoutes.map(({ path, element: E }) => (
                            <Route key={path} path={path} element={<E />} />
                        ))}
                    </Route>

                    {/* Shell — AppLayout (sidebar + header) */}
                    <Route element={<AppLayout />}>
                        {shellRoutes.map(({ path, element: E }) => (
                            <Route key={path} path={path} element={<E />} />
                        ))}
                    </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}

export default App;
