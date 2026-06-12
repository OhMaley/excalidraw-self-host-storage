import { ErrorPage } from "@components/ErrorPage";
import styles from "./NotFound.module.scss";

interface NotFoundProps {
    readonly description?: string;
}

export default function NotFound({ description }: NotFoundProps) {
    return (
        <ErrorPage
            imageClassName={styles.image}
            statusCode="404"
            heading="Not Found"
            description={description ?? "This page does not exist."}
        />
    );
}
