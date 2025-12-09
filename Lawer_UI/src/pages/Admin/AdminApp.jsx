import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import UsersPage from './UsersPage';
import PostsPage from './PostsPage';
import LawsPage from './LawsPage';
import QaSandboxPage from './QaSandboxPage';
import RagOpsPage from './RagOpsPage';

const AdminApp = () => (
  <AdminLayout>
    <Routes>
      <Route path="/" element={<Navigate to="/admin/users" replace />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/posts" element={<PostsPage />} />
      <Route path="/laws" element={<LawsPage />} />
      <Route path="/qa" element={<QaSandboxPage />} />
      <Route path="/rag" element={<RagOpsPage />} />
      <Route path="*" element={<Navigate to="/admin/users" replace />} />
    </Routes>
  </AdminLayout>
);

export default AdminApp;
