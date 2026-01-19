import { useParams } from "react-router-dom";

// Components
import ExcalidrawWrapper from "@components/ExcalidrawWrapper";

export default function Draw() {
    const { drawingId } = useParams<{ drawingId: string }>();
    return <ExcalidrawWrapper drawingId={drawingId} />;
}
