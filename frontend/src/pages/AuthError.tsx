import { ErrorPage } from "@components/ErrorPage";
import styles from "./AuthError.module.scss";

export default function AuthError() {
    return (
        <ErrorPage
            imageClassName={styles.image}
            statusCode="503"
            heading="Authentication Service Unavailable"
            description="The authentication service is temporarily unavailable. Please try again in a few moments."
        />
    );
}
