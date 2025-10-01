import { Navigate } from 'react-router-dom';
import { auth } from '../utils/auth';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = auth.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;