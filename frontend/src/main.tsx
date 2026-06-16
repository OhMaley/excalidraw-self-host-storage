import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Components
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";

// Providers
import { AuthProvider } from "@contexts/AuthContext";
import { ToastProvider } from "@components/ToastProvider";

// Style
import "./styles/fonts.scss";
import "./styles/index.scss";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AuthProvider>
            <BrowserRouter>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </BrowserRouter>
        </AuthProvider>
    </StrictMode>
);
