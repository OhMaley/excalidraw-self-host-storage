import { createContext } from "react";

export interface ToastMessage {
    title: string;
    description?: string;
    variant?: "error" | "warning" | "default";
}

export interface ToastContextType {
    showToast: (message: ToastMessage) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);
