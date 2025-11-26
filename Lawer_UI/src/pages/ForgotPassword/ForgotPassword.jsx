import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestForgotPassword } from '../../services/authService';
import AuthLayout from '../../components/AuthLayout/AuthLayout';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await requestForgotPassword(email);
      setMessage('Đã gửi OTP đặt lại mật khẩu. Kiểm tra email của bạn.');
    } catch (err) {
      const fallback = 'Không thể gửi OTP. Kiểm tra lại email.';
      const serverMsg = err?.response?.data?.message;
      setError(serverMsg || fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Quên mật khẩu">
      <form className="auth__form" onSubmit={handleSubmit}>
        <label className="auth__field">
          <span>Email</span>
          <input
            className="auth__input"
            type="email"
            placeholder="Nhập email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <button className="auth__submit" type="submit" disabled={loading}>
          {loading ? 'Đang gửi...' : 'Gửi OTP'}
        </button>
        {message && <div className="auth__alert auth__alert--success">{message}</div>}
        {error && <div className="auth__alert auth__alert--error">{error}</div>}
        <div className="auth__extra">
          Nhớ mật khẩu? <Link to="/login">Đăng nhập</Link> ·{' '}
          <Link to="/reset-password">Nhập mã OTP</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;
