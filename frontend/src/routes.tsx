import { lazy } from "react";

// Components
import { Navigate } from "react-router-dom";

// Types
import type { ComponentType, LazyExoticComponent } from "react";

interface RouteConfig {
    path: string;
    element: ComponentType | LazyExoticComponent<ComponentType>;
}

/* --------------------------------------------- *
 * Lazy-loaded pages (route-level splitting)     *
 * --------------------------------------------- */

const Draw = lazy(() => import("@pages/Draw/Draw"));
const Admin = lazy(() => import("@pages/Admin"));
const Workspaces = lazy(() => import("@pages/Workspaces/Workspaces"));
const WorkspaceDashboard = lazy(() => import("@pages/WorkspaceDashboard/WorkspaceDashboard"));
const CollectionView = lazy(() => import("@pages/CollectionView/CollectionView"));

/* --------------------------------------------- *
 * Route groups                                  *
 * --------------------------------------------- */

// No auth required
export const publicRoutes: RouteConfig[] = [
    { path: "/", element: () => <Navigate to="/draw" replace /> },
    { path: "/draw", element: Draw },
];

// Auth required — full-screen, no shell (AppLayout)
export const fullscreenRoutes: RouteConfig[] = [{ path: "/draw/:drawingId", element: Draw }];

// Auth required — admin role only
export const adminRoutes: RouteConfig[] = [{ path: "/admin", element: Admin }];

// Auth required — rendered inside AppLayout (sidebar + header)
export const shellRoutes: RouteConfig[] = [
    { path: "/workspaces", element: Workspaces },
    { path: "/workspaces/:wsId", element: WorkspaceDashboard },
    { path: "/workspaces/:wsId/collections/:colId", element: CollectionView },
];
