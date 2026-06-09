// Components
import { UserDropdownMenu } from "@components/UserDropdownMenu";

// Hooks
import { useAuth } from "@hooks/useAuth";

export function TopRightUI() {
    const { loading, isAuthenticated, user, login, logout } = useAuth();

    if (loading) return null;

    if (isAuthenticated && user) {
        return <UserDropdownMenu user={user} logout={logout} />;
    }

    return <button onClick={() => login()}>Login</button>;
}
