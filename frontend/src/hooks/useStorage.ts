import { useCallback, useState } from "react";

// Types
import type { SceneData, AppState } from "@excalidraw/excalidraw/types";

// Services
import { loadDrawing, saveDrawing } from "@services/storage.ts";

export function useStorage() {
    const [saving, setSaving] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<number>(0);

    const load = useCallback((id: string) => loadDrawing(id), []);

    const save = useCallback(
        async (payload: { elements: SceneData["elements"]; appState: Partial<AppState> }) => {
            setSaving(true);
            try {
                await saveDrawing(payload);
                setLastSavedAt(Date.now());
            } finally {
                setSaving(false);
            }
        },
        []
    );

    return { load, save, saving, lastSavedAt };
}
