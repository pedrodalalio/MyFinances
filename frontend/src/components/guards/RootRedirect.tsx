import { Navigate } from "react-router-dom";
import useAuth from "@hooks/useAuth";

function RootRedirect() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <Navigate to="/dashboard" />
  ) : (
    <Navigate to="/auth/sign-in" />
  );
}

export default RootRedirect;
