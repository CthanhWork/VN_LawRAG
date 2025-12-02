import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Home from '../pages/Home/Home';
import Login from '../pages/Login/Login';
import Settings from '../pages/Account/Account';
import Register from '../pages/Register/Register';
import ForgotPassword from '../pages/ForgotPassword/ForgotPassword';
import ResetPassword from '../pages/ResetPassword/ResetPassword';
import NotFound from '../pages/NotFound/NotFound';
import Rag from '../pages/Rag/Rag';
import AdminDashboard from '../pages/Admin/AdminDashboard';
import ProtectedRoute from '../routes/ProtectedRoute';
import AdminRoute from '../routes/AdminRoute';
import Profile from '../pages/Profile/Profile';
import './App.css';

const App = () => (
  <Router>
    <div className="app-shell">
      <Header />
      <main className="app-content shell-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/rag" element={<Rag />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="/account" element={<Navigate to="/settings" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  </Router>
);

export default App;
