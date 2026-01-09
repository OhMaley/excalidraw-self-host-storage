// Components
import { Routes, Route, Navigate } from "react-router-dom";

// Routes
import { publicRoutes, protectedRoutes } from "@routes/routes";
import { RequireAuth } from "@routes/RequireAuth";
import { RequireRole } from "@routes/RequireRoles";

function App() {
    return (
        <Routes>
            {/* Public */}
            {publicRoutes.map(({ path, element }) => (
                <Route key={path} path={path} element={element} />
            ))}

            {/* Protected */}
            <Route element={<RequireAuth />}>
                {protectedRoutes.map(({ path, element, roleRequiredAmong }) =>
                    roleRequiredAmong ? (
                        <Route element={<RequireRole requiresRoleAmong={roleRequiredAmong} />}>
                            <Route path={path} element={element} />
                        </Route>
                    ) : (
                        <Route path={path} element={element} />
                    )
                )}
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
