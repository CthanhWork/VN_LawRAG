import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import Home from '../pages/Home/Home';
import Login from '../pages/Login/Login';
import Account from '../pages/Account/Account';
import Register from '../pages/Register/Register';
import ForgotPassword from '../pages/ForgotPassword/ForgotPassword';
import ResetPassword from '../pages/ResetPassword/ResetPassword';
import NotFound from '../pages/NotFound/NotFound';
import ProtectedRoute from '../routes/ProtectedRoute';
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
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route path="/account" element={<Navigate to="/profile" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  </Router>
);

export default App;
