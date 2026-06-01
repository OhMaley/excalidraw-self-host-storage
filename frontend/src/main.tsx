import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Components
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";

// Providers
import { AuthProvider } from "@routes/AuthContext.tsx";

// Style
import "./styles/fonts.scss";
import "./styles/index.scss";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AuthProvider>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </AuthProvider>
    </StrictMode>
);
