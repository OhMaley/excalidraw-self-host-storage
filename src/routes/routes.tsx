import type { ReactNode } from "react";

// Components
import Home from "@pages/Home";
import Dashboard from "@pages/Dashboard";
import Draw from "@pages/Draw";
import Admin from "@pages/Admin";

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
    { path: "/draw", element: <Draw /> },
    { path: "/draw/:id", element: <Draw />, loginRequired: true },
    { path: "/dashboard", element: <Dashboard />, loginRequired: true },
    { path: "/admin", element: <Admin />, roleRequiredAmong: ["admin" as Role] },
];

export const publicRoutes = appRoutes.filter((r) => !r.loginRequired && !r.roleRequiredAmong);
export const protectedRoutes = appRoutes.filter((r) => r.loginRequired ?? r.roleRequiredAmong);
