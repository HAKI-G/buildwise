import { Navigate } from 'react-router-dom';
import { auth } from '../utils/auth';

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false; // no expiry claim — allow
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // malformed token — treat as expired
  }
};

const ProtectedRoute = ({ children }) => {
  const token = auth.getToken();

  if (!token || isTokenExpired(token)) {
    auth.logout(); // clear stale data
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;