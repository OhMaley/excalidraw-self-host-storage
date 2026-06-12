import { type RefObject } from "react";
import { Form } from "radix-ui";

import styles from "./NameFormField.module.scss";

interface NameFormFieldProps {
    readonly fieldName?: string;
    readonly value: string;
    readonly inputRef?: RefObject<HTMLInputElement | null>;
    readonly disabled: boolean;
    readonly onChange: (value: string) => void;
}

export function NameFormField({
    fieldName = "name",
    value,
    inputRef,
    disabled,
    onChange,
}: NameFormFieldProps) {
    return (
        <Form.Field name={fieldName} className={styles.field}>
            <Form.Label className={styles.label}>
                Name <span className={styles.required}>*</span>
            </Form.Label>
            <Form.Control asChild>
                <input
                    ref={inputRef}
                    className={styles.input}
                    type="text"
                    required
                    maxLength={100}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                />
            </Form.Control>
            <Form.Message className={styles.message} match="valueMissing">
                Please enter a name.
            </Form.Message>
        </Form.Field>
    );
}
