import { lazy } from "react";

// Components
import { Navigate } from "react-router-dom";

// Types
import type { Role } from "@routes/AuthContext";
import type { ComponentType, LazyExoticComponent } from "react";

export interface AppRoute {
    path: string;
    element: RouteComponent;
    loginRequired?: boolean;
    roleRequiredAmong?: Role[];
    children?: AppRoute[];
}

type RouteComponent = ComponentType | LazyExoticComponent<ComponentType>;

/* --------------------------------------------- *
 * Lazy-loaded pages (route-level splitting)     *
 * --------------------------------------------- */

const Draw = lazy(() => import("@pages/Draw"));
const Dashboard = lazy(() => import("@pages/Dashboard"));
const Admin = lazy(() => import("@pages/Admin"));
const Workspaces = lazy(() => import("@pages/Workspaces"));

/* --------------------------------------------- *
 * Route definitions                             *
 * --------------------------------------------- */

const appRoutes: AppRoute[] = [
    { path: "/", element: () => <Navigate to="/draw" replace /> },

    { path: "/draw", element: Draw },
    { path: "/draw/:drawingId", element: Draw, loginRequired: true },

    { path: "/dashboard", element: Dashboard, loginRequired: true },
    { path: "/admin", element: Admin, roleRequiredAmong: ["admin"] },
    { path: "/workspaces", element: Workspaces, loginRequired: true },
];

/* --------------------------------------------- *
 * Route helpers                                 *
 * --------------------------------------------- */

const requiresLogin = (r: AppRoute) => r.loginRequired === true;
const requiresRole = (r: AppRoute) => (r.roleRequiredAmong?.length ?? 0) > 0;

export const publicRoutes = appRoutes.filter((r) => !requiresLogin(r) && !requiresRole(r));
export const protectedRoutes = appRoutes.filter((r) => requiresLogin(r) || requiresRole(r));
