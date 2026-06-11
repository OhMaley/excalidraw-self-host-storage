import { Form } from "radix-ui";
import styles from "./DescriptionField.module.scss";

interface DescriptionFieldProps {
    readonly value?: string;
    readonly maxLength?: number;
    readonly placeholder?: string;
    readonly rows?: number;
    readonly disabled?: boolean;
    readonly onChange?: (value: string) => void;
}

export function DescriptionField({
    value,
    maxLength,
    placeholder,
    rows,
    disabled,
    onChange,
}: DescriptionFieldProps) {
    return (
        <Form.Field name="description" className={styles.field}>
            <Form.Label className={styles.label}>Description</Form.Label>
            <Form.Control asChild>
                <textarea
                    className={styles.textarea}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    rows={rows}
                    disabled={disabled}
                    value={value}
                    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                />
            </Form.Control>
        </Form.Field>
    );
}
