import { useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import './admin.css';

const nav = [
  { to: '/admin/users', label: 'Người dùng' },
  { to: '/admin/posts', label: 'Bài viết' },
  { to: '/admin/laws', label: 'Kho luật & corpus' },
  { to: '/admin/qa', label: 'QA sandbox' },
  { to: '/admin/rag', label: 'Vận hành RAG' },
];

const AdminLayout = ({ children }) => {
  useEffect(() => {
    document.body.classList.add('admin-mode');
    const head = document.head;
    const links = [
      { id: 'coreui-style', href: '/coreui/css/style.css' },
      { id: 'coreui-simplebar', href: '/coreui/css/vendors/simplebar.css' },
    ];
    links.forEach((item) => {
      if (!document.getElementById(item.id)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.id = item.id;
        link.href = item.href;
        head.appendChild(link);
      }
    });

    return () => document.body.classList.remove('admin-mode');
  }, []);

  return (
    <div className="admin-coreui d-flex">
      <div className="sidebar sidebar-dark sidebar-fixed border-end" id="sidebar">
        <div className="sidebar-header border-bottom">
          <div className="sidebar-brand">VN LAW ADMIN</div>
        </div>
        <ul className="sidebar-nav" data-coreui="navigation">
          {nav.map((item) => (
            <li className="nav-item" key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon-bullet" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="wrapper d-flex flex-column min-vh-100 bg-light flex-fill">
        <header className="header header-sticky mb-3 shadow-sm">
          <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-between py-2">
              <div>
                <div className="small text-uppercase text-secondary fw-semibold">Admin console</div>
                <h5 className="mb-0 fw-semibold">Quản trị hệ thống</h5>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Link to="/" className="btn btn-outline-secondary btn-sm">
                  Về trang chủ
                </Link>
                <span className="badge bg-secondary text-uppercase">CoreUI</span>
                <span className="badge bg-dark text-uppercase">Protected</span>
              </div>
            </div>
          </div>
        </header>

        <div className="body flex-grow-1 px-3 pb-4">
          <div className="container-lg">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
