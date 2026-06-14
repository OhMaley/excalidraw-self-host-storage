import { createContext, useContext } from "react";

export interface ToastMessage {
    title: string;
    description?: string;
    variant?: "error" | "warning" | "default";
}

interface ToastContextType {
    showToast: (message: ToastMessage) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}
