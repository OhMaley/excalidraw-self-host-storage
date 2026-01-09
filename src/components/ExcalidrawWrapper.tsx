import { useEffect, useState } from "react";

// Components
import { Excalidraw } from "@excalidraw/excalidraw";
import { useStorage } from "@hooks/useStorage";

// Type
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

// Style
import "@excalidraw/excalidraw/index.css";

// Utils
import { hydrateScene } from "@utils/sceneUtils";

interface ExcalidrawWrapperProps {
    drawingId?: string;
}

export default function ExcalidrawWrapper({ drawingId }: ExcalidrawWrapperProps) {
    const { load } = useStorage();
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);

    useEffect(() => {
        if (!excalidrawAPI) return;

        let cancelled = false;
        const doLoad = async () => {
            if (!drawingId) return;
            try {
                const scene = await load(drawingId);
                if (cancelled) return;
                excalidrawAPI.updateScene(hydrateScene(scene, excalidrawAPI));
            } catch (e) {
                console.error("Failed to load drawing", e);
            }
        };
        void doLoad();
        return () => {
            cancelled = true;
        };
    }, [drawingId, load, excalidrawAPI]);

    return (
        <div style={{ height: "100%", width: "100%" }}>
            <Excalidraw excalidrawAPI={(api) => setExcalidrawAPI(api)} />
        </div>
    );
}
