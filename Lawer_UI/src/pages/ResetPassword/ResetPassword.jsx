import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { resetPassword, resendOtp } from '../../services/authService';
import AuthLayout from '../../components/AuthLayout/AuthLayout';
import './ResetPassword.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', code: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const presetEmail = location.state?.email || '';

  useEffect(() => {
    if (presetEmail) {
      setForm((prev) => ({ ...prev, email: presetEmail }));
    }
  }, [presetEmail]);

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
      await resetPassword(form);
      setMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.');
      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      const fallback = 'Không đặt lại được mật khẩu. Kiểm tra mã OTP và email.';
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!form.email) {
      setError('Nhập email để gửi lại OTP.');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await resendOtp(form.email);
      setMessage('Đã gửi lại OTP, kiểm tra email.');
    } catch (err) {
      const fallback = 'Không gửi lại được OTP. Thử lại sau.';
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Nhập OTP & đặt lại mật khẩu">
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
          <span>Mã OTP</span>
          <div className="auth__otp-row">
            <input
              className="auth__input"
              name="code"
              placeholder="Nhập mã OTP"
              value={form.code}
              onChange={handleChange}
              required
            />
            <button type="button" className="auth__submit auth__submit--ghost" onClick={handleResend} disabled={loading}>
              Gửi lại
            </button>
          </div>
        </label>
        <label className="auth__field">
          <span>Mật khẩu mới</span>
          <input
            className="auth__input"
            type="password"
            name="newPassword"
            placeholder="Tối thiểu 6 ký tự"
            minLength={6}
            value={form.newPassword}
            onChange={handleChange}
            required
          />
        </label>
        <button className="auth__submit" type="submit" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đặt lại'}
        </button>
        {message && <div className="auth__alert auth__alert--success">{message}</div>}
        {error && <div className="auth__alert auth__alert--error">{error}</div>}
        <div className="auth__extra">
          Nhớ mật khẩu? <Link to="/login">Đăng nhập</Link> •{' '}
          <Link to="/forgot-password">Gửi lại OTP</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
