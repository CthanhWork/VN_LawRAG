import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { verifyOtp, resendOtp } from '../../services/authService';
import AuthLayout from '../../components/AuthLayout/AuthLayout';
import './VerifyOtp.css';

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const presetEmail = location.state?.email || '';
  const [form, setForm] = useState({ email: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      await verifyOtp(form);
      setMessage('Kích hoạt tài khoản thành công. Bạn có thể đăng nhập.');
      setTimeout(() => navigate('/login'), 800);
    } catch (err) {
      const fallback = 'Xác thực OTP thất bại. Kiểm tra lại email/mã OTP.';
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
    <AuthLayout title="Nhập OTP kích hoạt">
      <form className="auth__form" onSubmit={handleSubmit}>
        <label className="auth__field">
          <span>Email</span>
          <input
            className="auth__input"
            type="email"
            name="email"
            placeholder="Nhập email đăng ký"
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
        <button className="auth__submit" type="submit" disabled={loading}>
          {loading ? 'Đang xác thực...' : 'Xác thực'}
        </button>
        {message && <div className="auth__alert auth__alert--success">{message}</div>}
        {error && <div className="auth__alert auth__alert--error">{error}</div>}
        <div className="auth__extra">
          Đã xác thực? <Link to="/login">Đăng nhập</Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default VerifyOtp;
