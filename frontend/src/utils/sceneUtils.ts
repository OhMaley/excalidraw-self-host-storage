// Type
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawFile } from "@services/storage";

export function hydrateScene(file: ExcalidrawFile, excalidrawAPI: ExcalidrawImperativeAPI) {
    const currentAppState = excalidrawAPI.getAppState();

    return {
        elements: file.elements,
        appState: {
            ...currentAppState,
            ...file.appState,
            collaborators: currentAppState.collaborators,
        },
    };
}
