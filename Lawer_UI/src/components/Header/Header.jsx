import { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import './Header.css';

const Header = () => {
  const { user, isLogin, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const [openUser, setOpenUser] = useState(false);
  const userRef = useRef(null);
  const initials = (user?.displayName || user?.email || 'U').slice(0, 2).toUpperCase();
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const isAdmin = roles.some((role) => String(role).toUpperCase() === 'ADMIN');

  useEffect(() => {
    const handler = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) {
        setOpenUser(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="header">
      <div className="shell-container header__inner">
        <div className="header__left">
          <Link to="/" className="header__logo">
            <img className="header__logo-img" src="/coreui/assets/img/VNLAW.svg" alt="VNLAW logo" />
          </Link>
          <nav className="header__nav">
            <NavLink
              to="/"
              className={({ isActive }) => `header__link ${isActive ? 'is-active' : ''}`}
              end
            >
              Trang chủ
            </NavLink>
            <NavLink
              to="/chatbot"
              className={({ isActive }) => `header__link ${isActive ? 'is-active' : ''}`}
            >
              Chatbot
            </NavLink>
          </nav>
        </div>

        <div className="header__account">
          {isLogin ? (
            <div className="header__userbox" ref={userRef}>
              {isAdmin && (
                <NavLink to="/admin" className="header__link header__link--ghost">
                  Admin
                </NavLink>
              )}
              <div className="header__avatar" onClick={() => setOpenUser((v) => !v)}>
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" /> : initials}
              </div>
              <div className="header__user-info" onClick={() => setOpenUser((v) => !v)}>
                <div className="header__user-name">{user?.displayName || 'Người dùng'}</div>
                <div className="header__user-email">{user?.email}</div>
              </div>
              {openUser && (
                <div className="header__dropdown">
                  {isAdmin && <Link to="/admin">Admin console</Link>}
                  <Link to="/profile">Trang cá nhân</Link>
                  <Link to="/settings">Cài đặt</Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="header__guest">
              <NavLink to="/login" className="header__logout">
                Đăng nhập
              </NavLink>
              <NavLink to="/register" className="header__link">
                Đăng ký
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
