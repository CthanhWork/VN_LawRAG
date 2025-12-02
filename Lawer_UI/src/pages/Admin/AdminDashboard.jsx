import { useMemo, useState } from 'react';
import UsersPanel from './components/UsersPanel';
import PostsPanel from './components/PostsPanel';
import LawsPanel from './components/LawsPanel';
import './AdminDashboard.css';

const sections = [
  { id: 'users', label: 'Người dùng', sub: 'Kiểm soát trạng thái & vai trò' },
  { id: 'posts', label: 'Bài viết', sub: 'Duyệt quyền hiển thị và bình luận' },
  { id: 'laws', label: 'Kho văn bản', sub: 'Tra cứu, khai thác dữ liệu pháp luật' },
];

const AdminDashboard = () => {
  const [section, setSection] = useState('users');
  const currentSection = useMemo(
    () => sections.find((item) => item.id === section),
    [section],
  );

  const renderSection = () => {
    switch (section) {
      case 'posts':
        return <PostsPanel />;
      case 'laws':
        return <LawsPanel />;
      default:
        return <UsersPanel />;
    }
  };

  return (
    <section className="admin page-card">
      <div className="admin__layout">
        <aside className="admin__sidebar">
          <div className="admin__brand">
            <p className="admin__eyebrow">Khu vực quản trị</p>
            <h1 className="admin__title">Bảng điều hành</h1>
          </div>

          <div className="admin__menu">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`admin__menu-item ${section === item.id ? 'is-active' : ''}`}
                onClick={() => setSection(item.id)}
              >
                <div>
                  <div className="admin__menu-title">{item.label}</div>
                  <div className="admin__menu-sub">{item.sub}</div>
                </div>
                <span className="admin__menu-dot" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="admin__sidebar-foot">
            <div className="pill pill--outline">ADMIN</div>
          </div>
        </aside>

        <div className="admin__body">
          <header className="admin__hero">
            <div>
              <p className="admin__eyebrow">Điều phối</p>
              <h2 className="admin__hero-title">{currentSection?.label || 'Trung tâm admin'}</h2>
            </div>
          </header>

          <div className="admin__content">{renderSection()}</div>
        </div>
      </div>
    </section>
  );
};

export default AdminDashboard;
