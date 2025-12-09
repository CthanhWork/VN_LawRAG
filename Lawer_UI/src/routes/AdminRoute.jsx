import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';

const hasAdminRole = (roles) =>
  Array.isArray(roles) && roles.some((role) => String(role).toUpperCase() === 'ADMIN');

const AdminRoute = ({ children }) => {
  const { isLogin, user, loading } = useContext(UserContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loading shell-container">
        <div className="page-loading__spinner" />
        <div>Loading...</div>
      </div>
    );
  }

  if (!isLogin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasAdminRole(user?.roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
