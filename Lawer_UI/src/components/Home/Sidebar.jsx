import { Link } from 'react-router-dom';
import './HomeShared.css';

const Sidebar = ({ firstLetter, user, onLogout }) => (
  <div className="home-feed__sidebar page-card">
    <div className="home-feed__user">
      <div className="home-feed__avatar">{firstLetter}</div>
      <div>
        <div className="home-feed__name">{user?.displayName || 'Người dùng'}</div>
        <div className="home-feed__muted">{user?.email}</div>
      </div>
    </div>
    <div className="home-feed__menu">
      <Link to="/profile">Trang cá nhân</Link>
      <button type="button" onClick={onLogout}>
        Đăng xuất
      </button>
    </div>
  </div>
);

export default Sidebar;
