import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updateProfile, changePassword, uploadAvatar, deleteAvatar } from '../../services/socialService';
import { UserContext } from '../../contexts/UserContext';
import './Account.css';

const AccountSettings = () => {
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
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    setAvatarPreview(user?.avatarUrl || '');
  }, [user?.avatarUrl]);

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

  const handleAvatarSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError('');
    setSuccess('');
  };

  const submitAvatar = async (event) => {
    event?.preventDefault?.();
    if (!avatarFile) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await uploadAvatar(avatarFile);
      const updated = res?.data || res || {};
      const nextAvatar = updated.avatarUrl || avatarPreview;
      setUser((prev) => ({
        ...prev,
        displayName: updated.displayName || prev?.displayName,
        email: updated.email || prev?.email,
        avatarUrl: nextAvatar || prev?.avatarUrl,
        roles: updated.roles || prev?.roles,
      }));
      setAvatarPreview(nextAvatar);
      setAvatarFile(null);
      setSuccess('Cap nhat avatar thanh cong.');
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || 'Khong the cap nhat avatar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await deleteAvatar();
      const updated = res?.data || res || {};
      setAvatarPreview('');
      setAvatarFile(null);
      setUser((prev) => ({
        ...prev,
        avatarUrl: '',
        displayName: updated.displayName || prev?.displayName,
        email: updated.email || prev?.email,
        roles: updated.roles || prev?.roles,
      }));
      setSuccess('Da xoa avatar.');
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || 'Khong the xoa avatar.');
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
      setSuccess('Cập nhật hồ sơ thành công.');
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
          <p className="account__eyebrow">Cài đặt</p>
          <h1 className="account__title">Thông tin tài khoản</h1>
          <p className="account__subtitle">Cập nhật tên hiển thị và đổi mật khẩu.</p>
        </div>
        <div className="account__cta">
          <Link className="account__button account__button--ghost" to="/profile">
            Trang cá nhân
          </Link>
          <button className="account__button account__button--ghost" onClick={handleRefresh}>
            {loading ? 'Đang tải...' : 'Làm mới'}
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
          <div className="account__value">{user?.displayName || 'Chưa đặt tên'}</div>
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

        <div className="account__card account__card--stretch account__card--avatar">
          <div className="account__label">Avatar</div>
          <div className="account__avatar-row">
            <div className={`account__avatar-preview ${avatarPreview ? 'is-image' : ''}`}>
              {avatarPreview ? <img src={avatarPreview} alt="Avatar" /> : (user?.displayName || 'U')[0]?.toUpperCase()}
            </div>
            <div className="account__avatar-actions">
              <label className="account__file-button">
                <input type="file" accept="image/*" onChange={handleAvatarSelect} />
                Chon anh
              </label>
              <div className="account__avatar-buttons">
                <button
                  className="account__button"
                  type="button"
                  onClick={submitAvatar}
                  disabled={loading || !avatarFile}
                >
                  {loading ? 'Dang tai...' : 'Cap nhat avatar'}
                </button>
                <button
                  className="account__button account__button--ghost"
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={loading || !(avatarPreview || user?.avatarUrl)}
                >
                  Xoa avatar
                </button>
              </div>
              <p className="account__muted">Anh vuong &lt; 5MB (jpg/png/webp) se ro net hon.</p>
            </div>
          </div>
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

export default AccountSettings;
