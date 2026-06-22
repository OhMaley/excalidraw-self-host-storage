import { useEffect, useRef, useState } from "react";
import { API_BASE, fetchBlob } from "@services/api";

interface ThumbnailTarget {
    id: string;
    collection_id: string;
    updated_at: string | null;
}

export function useThumbnail(wsId: string | undefined, drawing: ThumbnailTarget): string | null {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const prevUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (!wsId) return;
        let cancelled = false;
        const url = `${API_BASE}/workspaces/${encodeURIComponent(wsId)}/collections/${encodeURIComponent(drawing.collection_id)}/drawings/${encodeURIComponent(drawing.id)}/thumbnail`;

        void fetchBlob(url)
            .then((blob) => {
                if (cancelled || !blob) return;
                const newUrl = URL.createObjectURL(blob);
                prevUrlRef.current = newUrl;
                setObjectUrl(newUrl);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
            if (prevUrlRef.current) {
                URL.revokeObjectURL(prevUrlRef.current);
                prevUrlRef.current = null;
            }
            setObjectUrl(null);
        };
    }, [wsId, drawing.collection_id, drawing.id, drawing.updated_at]);

    return objectUrl;
}
