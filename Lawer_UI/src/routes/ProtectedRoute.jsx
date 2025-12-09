import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';

const ProtectedRoute = ({ children }) => {
  const { isLogin, loading } = useContext(UserContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loading shell-container">
        <div className="page-loading__spinner" />
        <div>Dang tai trang...</div>
      </div>
    );
  }

  if (!isLogin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default ProtectedRoute;
