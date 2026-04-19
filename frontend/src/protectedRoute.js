import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, roles }) {
  const auth = useSelector((state) => state.auth);

  console.log("ProtectedRoute check:", { isLoggedIn: auth.isLoggedIn, role: auth.role, token: !!auth.token, requiredRoles: roles });

  // Not logged in
  if (!auth.isLoggedIn) {
    console.log("Not logged in, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  // If roles are specified and user has a role, check if it matches
  if (roles && auth.role && !roles.includes(auth.role)) {
    const fallback = auth.role === "MANAGER" ? "/dashboard" : "/";
    console.log("Role not allowed, redirecting to", fallback);
    return <Navigate to={fallback} replace />;
  }

  // If roles are specified but user doesn't have a role yet, prevent accidental access
  if (roles && !auth.role) {
    console.log("Missing role info, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  console.log("Access granted");
  return children;
}