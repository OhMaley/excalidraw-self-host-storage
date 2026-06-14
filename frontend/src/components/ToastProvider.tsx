import { useState, useCallback, useRef } from "react";

// Components
import { Toast } from "radix-ui";

// Hooks
import { ToastContext, type ToastMessage } from "@hooks/useToast";

// Styles
import styles from "./ToastProvider.module.scss";

interface ToastState extends ToastMessage {
    open: boolean;
    key: number;
}

const variantClass: Record<NonNullable<ToastMessage["variant"]>, string> = {
    default: styles.toast,
    error: styles.toastError,
    warning: styles.toastWarning,
};

export function ToastProvider({ children }: { readonly children: React.ReactNode }) {
    const [toast, setToast] = useState<ToastState | null>(null);
    const keyRef = useRef(0);

    const showToast = useCallback((message: ToastMessage) => {
        setToast({ ...message, open: true, key: ++keyRef.current });
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            <Toast.Provider>
                {children}
                {toast && (
                    <Toast.Root
                        key={toast.key}
                        open={toast.open}
                        onOpenChange={(open) => setToast((prev) => prev && { ...prev, open })}
                        className={variantClass[toast.variant ?? "default"]}
                        duration={6000}
                    >
                        <div className={styles.toastBody}>
                            <Toast.Title className={styles.toastTitle}>{toast.title}</Toast.Title>
                            {toast.description && (
                                <Toast.Description className={styles.toastDescription}>
                                    {toast.description}
                                </Toast.Description>
                            )}
                        </div>
                        <Toast.Close className={styles.toastClose}>✕</Toast.Close>
                    </Toast.Root>
                )}
                <Toast.Viewport className={styles.toastViewport} />
            </Toast.Provider>
        </ToastContext.Provider>
    );
}
