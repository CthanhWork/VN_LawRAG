import './AuthLayout.css';

const AuthLayout = ({ children, title, image }) => (
  <div className="auth auth--split">
    <div className="auth__left">
      <div
        className="auth__bg"
        style={{
          backgroundImage: `url(${
            image ||
            'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1500&q=80'
          })`,
        }}
      />
    </div>
    <div className="auth__right">
      <div className="auth__form-box">
        <div className="auth__logo-wrapper">
          <div className="auth__logo">VL</div>
          <div className="auth__brand-title">VN Law</div>
        </div>
        {title && <h2 className="auth__title">{title}</h2>}
        {children}
      </div>
    </div>
  </div>
);

export default AuthLayout;
