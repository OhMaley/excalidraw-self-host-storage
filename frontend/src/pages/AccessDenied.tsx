import { ErrorPage } from "@components/ErrorPage";
import styles from "./AccessDenied.module.scss";

interface AccessDeniedProps {
    readonly requiresRoleAmong?: string[];
}

export default function AccessDenied({ requiresRoleAmong }: AccessDeniedProps) {
    const description =
        requiresRoleAmong && requiresRoleAmong.length > 0 ? (
            <>
                To view the content of this page, you must be granted at least one of the following
                roles:
                <strong> {requiresRoleAmong.join(", ")}</strong>.
            </>
        ) : (
            <>You do not have sufficient permissions to view this page.</>
        );

    return (
        <ErrorPage
            imageClassName={styles.image}
            statusCode="403"
            heading="Access Denied"
            description={description}
        />
    );
}
