import { useEffect } from "react";

// Hooks
import { useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();

    useEffect(() => {
        const wasAuthed = localStorage.getItem("was_authenticated") === "true";
        if (wasAuthed) {
            // User is either connected or was previously connected.
            // Let's redirect the user to the 'connected' area -> dashboard.
            void navigate("/dashboard", { replace: true });
        } else {
            // User is visiting as guest. The user only wants to do a quick draw
            // Redirect to /draw
            void navigate("/draw", { replace: true });
        }
    }, [navigate]);

    return null;
}
