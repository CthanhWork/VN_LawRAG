import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="shell-container footer__container">
      <div className="footer__section">
        <h4 className="footer__title">VN Law</h4>
        <p className="footer__text">Nền tảng tra cứu & RAG pháp lý Việt Nam.</p>
        <p className="footer__text">© 2025 VN Law.</p>
      </div>
      <div className="footer__section">
        <h4 className="footer__title">Liên hệ</h4>
        <ul className="footer__list">
          <li className="footer__text">Email: support@vnlaw.vn</li>
          <li className="footer__text">Hotline: 1900 63 67 89</li>
          <li className="footer__text">Thời gian: 8h00 - 18h00 (T2 - T6)</li>
        </ul>
      </div>
      <div className="footer__section">
        <h4 className="footer__title">Tài nguyên</h4>
        <ul className="footer__list">
          <li><a className="footer__link" href="/chatbot">Chatbot pháp lý</a></li>
          <li><a className="footer__link" href="/rag">Bộ sưu tập RAG</a></li>
          <li><a className="footer__link" href="/login">Đăng nhập</a></li>
        </ul>
      </div>
    </div>
  </footer>
);

export default Footer;
