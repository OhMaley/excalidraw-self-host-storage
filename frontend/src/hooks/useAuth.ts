import { useContext } from "react";
import { AuthContext } from "@routes/AuthContext";

export function useAuth() {
    return useContext(AuthContext);
}
