// Components
import { UserDropdownMenu } from "@components/UserDropdownMenu";

// Hooks
import { useAuth } from "@hooks/useAuth";

// Styles
import styles from "./TopRightUI.module.scss";

export default function TopRightUI() {
    const { loading, isAuthenticated, user, login, logout } = useAuth();

    if (loading) return null;

    if (isAuthenticated && user) {
        return <UserDropdownMenu user={user} logout={logout} />;
    }

    return (
        <button className={styles.button} onClick={() => login()}>
            Login
        </button>
    );
}
