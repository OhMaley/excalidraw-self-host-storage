import { ScrollArea } from "radix-ui";
import styles from "./VScrollbar.module.scss";

export function VScrollbar() {
    return (
        <ScrollArea.Scrollbar orientation="vertical" className={styles.scrollbar}>
            <ScrollArea.Thumb className={styles.scrollbarThumb} />
        </ScrollArea.Scrollbar>
    );
}
