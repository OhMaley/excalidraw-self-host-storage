import { CollapsibleSection } from "./LibraryPanel";
import styles from "./LibraryPanel.module.scss";

// Workspace/Collection/Drawing library sections require an authenticated
// backend session, so this chunk is lazy-loaded and only rendered once
// signed in — keeps the anonymous/local-only experience light.
export default function AuthenticatedLibrarySections() {
    return (
        <>
            <CollapsibleSection label="Workspace" defaultOpen={false}>
                <p className={styles.comingSoon}>Coming in a future update</p>
            </CollapsibleSection>

            <CollapsibleSection label="Collection" defaultOpen={false}>
                <p className={styles.comingSoon}>Coming in a future update</p>
            </CollapsibleSection>

            <CollapsibleSection label="Drawing" defaultOpen={false}>
                <p className={styles.comingSoon}>Coming in a future update</p>
            </CollapsibleSection>
        </>
    );
}
