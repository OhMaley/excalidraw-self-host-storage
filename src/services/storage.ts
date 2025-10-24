// Types
import type { SceneData, AppState } from "@excalidraw/excalidraw/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export type StoredDrawing = {
  id?: string;
  elements?: SceneData["elements"];
  appState?: Partial<AppState>;
  collaborators?: SceneData["collaborators"];
  captureUpdate?: SceneData["captureUpdate"];
};

export async function loadDrawing(id: string): Promise<StoredDrawing> {
  const res = await fetch(`${API_BASE}/drawings/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to load drawing: ${res.status}`);
  }
  return res.json();
}

export async function saveDrawing(body: StoredDrawing): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/drawings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Failed to save drawing: ${res.status}`);
  }
  return res.json();
}
