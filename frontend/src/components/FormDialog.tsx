import { forwardRef, type ReactNode } from "react";
import { Dialog } from "radix-ui";

import styles from "./FormDialog.module.scss";

interface FormDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly children: ReactNode;
}

export const FormDialog = forwardRef<HTMLDivElement, FormDialogProps>(function FormDialog(
    { open, onOpenChange, children },
    ref
) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                <Dialog.Content
                    ref={ref}
                    className={styles.content}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    {children}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
});
