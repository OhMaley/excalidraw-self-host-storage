import type { ReactNode } from "react";

// Components
import Home from "@pages/Home";
import Dashboard from "@pages/Dashboard";

// Types
import type { Role } from "@routes/AuthContext";

export interface AppRoute {
    path: string;
    element: ReactNode;
    loginRequired?: boolean;
    roleRequiredAmong?: Role[];
    children?: AppRoute[];
}

const appRoutes: AppRoute[] = [
    { path: "/", element: <Home /> },
    { path: "/draw/:id", element: <Home /> },
    { path: "/dashboard", element: <Dashboard />, loginRequired: true },
    { path: "/admin", element: <Dashboard />, roleRequiredAmong: ["admin" as Role] },
];

export const publicRoutes = appRoutes.filter((r) => !r.loginRequired && !r.roleRequiredAmong);
export const protectedRoutes = appRoutes.filter((r) => r.loginRequired ?? r.roleRequiredAmong);
