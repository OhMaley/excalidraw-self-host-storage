import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";

// Components
import { Spinner } from "@components/Spinner";

const ExcalidrawWrapper = lazy(() => import("./ExcalidrawWrapper"));

export default function Draw() {
    const { wsId, colId, drawingId } = useParams<{
        wsId: string;
        colId: string;
        drawingId: string;
    }>();
    return (
        <Suspense fallback={<Spinner size="3rem" />}>
            <ExcalidrawWrapper wsId={wsId} colId={colId} drawingId={drawingId} />
        </Suspense>
    );
}
