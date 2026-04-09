import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/home" replace />;
  if (!currentUser.emailVerified) return <Navigate to="/verify-email" replace />;
  return children;
}
