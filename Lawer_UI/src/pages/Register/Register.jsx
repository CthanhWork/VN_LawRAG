import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../services/authService';
import AuthLayout from '../../components/AuthLayout/AuthLayout';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await register(form);
      setMessage('Đăng ký thành công, vui lòng kiểm tra email để xác thực OTP.');
      setTimeout(() => navigate('/login'), 700);
    } catch (err) {
      const fallback = 'Đăng ký thất bại. Kiểm tra lại thông tin.';
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Đăng ký">
      <form className="auth__form" onSubmit={handleSubmit}>
        <label className="auth__field">
          <span>Họ tên / Hiển thị</span>
          <input
            className="auth__input"
            name="displayName"
            placeholder="Nhập tên hiển thị"
            value={form.displayName}
            onChange={handleChange}
            required
          />
        </label>
        <label className="auth__field">
          <span>Email</span>
          <input
            className="auth__input"
            type="email"
            name="email"
            placeholder="Nhập email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>
        <label className="auth__field">
          <span>Mật khẩu</span>
          <input
            className="auth__input"
            type="password"
            name="password"
            placeholder="Tối thiểu 6 ký tự"
            minLength={6}
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>
        <button className="auth__submit" type="submit" disabled={loading}>
          {loading ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
        {message && <div className="auth__alert auth__alert--success">{message}</div>}
        {error && <div className="auth__alert auth__alert--error">{error}</div>}
        <div className="auth__extra">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          <div style={{ marginTop: 6 }}>
            Quên mật khẩu? <Link to="/forgot-password">Khôi phục</Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;
