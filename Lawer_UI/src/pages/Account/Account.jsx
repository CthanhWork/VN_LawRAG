import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, changePassword } from '../../services/socialService';
import { UserContext } from '../../contexts/UserContext';
import './Account.css';

const Account = () => {
  const { user, setUser, logout, checkTokenAndSetUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const handleRefresh = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await checkTokenAndSetUser();
      setForm((prev) => ({ ...prev, displayName: user?.displayName || '' }));
      setSuccess('Đã tải lại thông tin.');
    } catch (err) {
      setError('Không thể tải thông tin người dùng.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await updateProfile({ displayName: form.displayName });
      const updated = res?.data || {};
      const normalizedRoles = Array.isArray(updated.roles)
        ? updated.roles
        : updated.roles
          ? [updated.roles].flat()
          : [];
      setUser((prev) => ({
        ...prev,
        displayName: updated.displayName || form.displayName,
        email: updated.email || prev?.email,
        roles: normalizedRoles.length ? normalizedRoles : prev?.roles,
      }));
      const successText = 'Cập nhật hồ sơ thành công.';
      setSuccess(successText);
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || 'Không thể cập nhật hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await changePassword(passwordForm);
      setSuccess('Đổi mật khẩu thành công.');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || 'Không thể đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const token = localStorage.getItem('accessToken');
  const tokenDisplay = token ? `${token.slice(0, 12)}...${token.slice(-6)}` : 'Chưa có';
  const roles = Array.isArray(user?.roles) ? user.roles : [];

  return (
    <section className="account page-card">
      <div className="account__header">
        <div>
          <p className="account__eyebrow">Hồ sơ cá nhân</p>
          <h1 className="account__title">Thông tin tài khoản</h1>
          <p className="account__subtitle">Cập nhật hồ sơ và đổi mật khẩu.</p>
        </div>
        <div className="account__cta">
          <button className="account__button account__button--ghost" onClick={handleRefresh}>
            {loading ? 'Đang tải...' : 'Làm mới profile'}
          </button>
          <button className="account__button account__button--danger" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </div>

      {error && <div className="account__alert account__alert--error">{error}</div>}
      {success && <div className="account__alert account__alert--success">{success}</div>}

      <div className="account__grid">
        <div className="account__card">
          <div className="account__label">Người dùng</div>
          <div className="account__value">{user?.displayName || 'Không rõ tên'}</div>
          <div className="account__muted">{user?.email || 'Chưa có email'}</div>
        </div>

        <div className="account__card">
          <div className="account__label">Roles</div>
          <div className="account__chips">
            {roles.length
              ? roles.map((role) => (
                  <span key={role} className="account__chip">
                    {role}
                  </span>
                ))
              : 'No role'}
          </div>
        </div>

        <div className="account__card">
          <div className="account__label">Access token</div>
          <div className="account__value">{tokenDisplay}</div>
          <div className="account__muted">Lưu trong localStorage</div>
        </div>

        <div className="account__card account__card--stretch">
          <form className="account__form" onSubmit={submitProfile}>
            <div className="account__label">Cập nhật hồ sơ</div>
            <label className="account__field">
              <span>Tên hiển thị</span>
              <input
                name="displayName"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                required
              />
            </label>
            <button className="account__button" type="submit" disabled={loading}>
              Lưu
            </button>
          </form>
        </div>

        <div className="account__card account__card--stretch">
          <form className="account__form" onSubmit={submitPassword}>
            <div className="account__label">Đổi mật khẩu</div>
            <label className="account__field">
              <span>Mật khẩu hiện tại</span>
              <input
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
            </label>
            <label className="account__field">
              <span>Mật khẩu mới</span>
              <input
                type="password"
                name="newPassword"
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
              />
            </label>
            <button className="account__button" type="submit" disabled={loading}>
              Đổi mật khẩu
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Account;
