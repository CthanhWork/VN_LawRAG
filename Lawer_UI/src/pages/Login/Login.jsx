import { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { login } from '../../services/authService';
import { UserContext } from '../../contexts/UserContext';
import AuthLayout from '../../components/AuthLayout/AuthLayout';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from || '/';
  const { checkTokenAndSetUser, isLogin } = useContext(UserContext);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const data = await login(form);
      const token = data?.data?.token || data?.token;
      const refresh = data?.data?.refreshToken || data?.refreshToken;
      if (token) {
        localStorage.setItem('accessToken', token);
        await checkTokenAndSetUser();
      }
      if (refresh) {
        localStorage.setItem('refreshToken', refresh);
      }
      setMessage('Đăng nhập thành công');
      setTimeout(() => navigate(redirectPath), 400);
    } catch (err) {
      const fallback = 'Không thể đăng nhập. Kiểm tra lại tài khoản hoặc API.';
      const serverMessage = err?.response?.data?.message;
      setError(serverMessage || fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLogin) {
      navigate(redirectPath);
    }
  }, [isLogin, navigate, redirectPath]);

  return (
    <AuthLayout title="Đăng nhập">
      <form className="auth__form" onSubmit={handleSubmit}>
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
          <span>Mat khau</span>
          <input
            className="auth__input"
            type="password"
            name="password"
            placeholder="Nhập mật khẩu"
            value={form.password}
            onChange={handleChange}
            required
            minLength={4}
          />
        </label>

        <button className="auth__submit" type="submit" disabled={loading}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        {message && <div className="auth__alert auth__alert--success">{message}</div>}
        {error && <div className="auth__alert auth__alert--error">{error}</div>}

        <div className="auth__extra">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link> ·{' '}
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;
