import { Suspense } from "react";

// Components
import { Routes, Route, Navigate } from "react-router-dom";

// Routes
import { publicRoutes, protectedRoutes } from "@routes/routes";
import { RequireAuth } from "@routes/RequireAuth";
import { RequireRole } from "@routes/RequireRoles";

function App() {
    return (
        <Suspense fallback={null}>
            <Routes>
                {/* Public */}
                {publicRoutes.map(({ path, element: Element }) => (
                    <Route key={path} path={path} element={<Element />} />
                ))}

                {/* Protected */}
                <Route element={<RequireAuth />}>
                    {protectedRoutes.map(({ path, element: Element, roleRequiredAmong }) =>
                        roleRequiredAmong?.length ? (
                            <Route element={<RequireRole requiresRoleAmong={roleRequiredAmong} />}>
                                <Route path={path} element={<Element />} />
                            </Route>
                        ) : (
                            <Route path={path} element={<Element />} />
                        )
                    )}
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}

export default App;
