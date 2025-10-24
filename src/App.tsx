// Components
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "@pages/Home";

function App() {
  return (
    <Routes>
      {/* Home page without a loaded canvas */}
      <Route path="/" element={<Home />} />

      {/* Home page loaded with a canvas */}
      <Route path="/draw/:id" element={<Home />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
