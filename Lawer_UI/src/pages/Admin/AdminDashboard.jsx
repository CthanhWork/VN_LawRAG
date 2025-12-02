import { useState } from 'react';
import UsersPanel from './components/UsersPanel';
import PostsPanel from './components/PostsPanel';
import LawsPanel from './components/LawsPanel';
import RagPanel from './components/RagPanel';
import './AdminDashboard.css';

const tabs = [
  { id: 'users', label: 'Nguoi dung', sub: 'Trang thai & vai tro' },
  { id: 'posts', label: 'Bai viet', sub: 'Quyen xem & binh luan' },
  { id: 'laws', label: 'Van ban luat', sub: 'Yeu cau X-API-KEY' },
  { id: 'rag', label: 'RAG', sub: 'Trang thai chi muc' },
];

const AdminDashboard = () => {
  const [tab, setTab] = useState('users');

  return (
    <section className="admin page-card">
      <div className="admin__header">
        <div>
          <p className="admin__eyebrow">Admin</p>
          <h1 className="page-title">Bang dieu khien Admin</h1>
          <p className="page-subtitle">Quan tri nguoi dung/bai viet, van ban luat va RAG.</p>
        </div>
        <div className="admin__chips">
          <span className="pill pill--outline">JWT: ADMIN</span>
          <span className="pill pill--ghost">Khu vuc bao ve</span>
        </div>
      </div>

      <div className="admin__tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin__tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.label}</span>
            <span className="admin__tab-sub">{t.sub}</span>
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersPanel />}
      {tab === 'posts' && <PostsPanel />}
      {tab === 'laws' && <LawsPanel />}
      {tab === 'rag' && <RagPanel />}
    </section>
  );
};

export default AdminDashboard;
