import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Components
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";

// Providers
import { AuthProvider } from "@contexts/AuthContext";
import { ToastProvider } from "@components/ToastProvider";
import { Tooltip } from "radix-ui";

const TOOLTIP_DELAY_MS = 500;

// Style
import "./styles/fonts.scss";
import "./styles/index.scss";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AuthProvider>
            <BrowserRouter>
                <Tooltip.Provider delayDuration={TOOLTIP_DELAY_MS}>
                    <ToastProvider>
                        <App />
                    </ToastProvider>
                </Tooltip.Provider>
            </BrowserRouter>
        </AuthProvider>
    </StrictMode>
);
