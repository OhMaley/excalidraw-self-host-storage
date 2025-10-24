import { useParams } from "react-router-dom";

// Components
import ExcalidrawWrapper from "../components/ExcalidrawWrapper";

export default function Home() {
  const { id } = useParams<{ id: string }>();
  return <ExcalidrawWrapper drawingId={id} />;
}
