import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";

// Components
import { Spinner } from "@components/Spinner";

const ExcalidrawWrapper = lazy(() => import("@components/ExcalidrawWrapper"));

export default function Draw() {
    const { drawingId } = useParams<{ drawingId: string }>();
    return (
        <Suspense fallback={<Spinner size="3rem" />}>
            <ExcalidrawWrapper drawingId={drawingId} />
        </Suspense>
    );
}
