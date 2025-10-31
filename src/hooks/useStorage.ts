import { useCallback, useRef, useState } from "react";

// Types
import type { SceneData, AppState } from "@excalidraw/excalidraw/types";

// Services
import { loadDrawing, saveDrawing } from "@services/storage.ts";

export function useStorage() {
    const [saving, setSaving] = useState(false);
    const lastSavedRef = useRef<number>(0);

    const load = useCallback(async (id: string) => {
        const data = await loadDrawing(id);
        return data;
    }, []);

    const save = useCallback(
        async (payload: { elements: SceneData["elements"]; appState: Partial<AppState> }) => {
            setSaving(true);
            try {
                await saveDrawing(payload);
                lastSavedRef.current = Date.now();
            } finally {
                setSaving(false);
            }
        },
        []
    );

    return { load, save, saving, lastSavedAt: lastSavedRef.current };
}
