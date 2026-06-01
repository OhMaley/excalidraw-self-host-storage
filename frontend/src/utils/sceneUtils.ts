// Type
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { StoredDrawing } from "@services/storage";

export function hydrateScene(stored: StoredDrawing, excalidrawAPI: ExcalidrawImperativeAPI) {
    const currentAppState = excalidrawAPI.getAppState();

    return {
        elements: stored.elements,
        collaborators: stored.collaborators ?? currentAppState.collaborators,
        captureUpdate: stored.captureUpdate,
        appState: stored.appState
            ? {
                  ...currentAppState,
                  ...stored.appState,
                  collaborators: stored.appState.collaborators ?? currentAppState.collaborators,
              }
            : currentAppState,
    };
}
