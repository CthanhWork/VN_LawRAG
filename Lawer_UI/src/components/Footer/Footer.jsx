import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="shell-container footer__container">
      <div className="footer__section">
        <h4 className="footer__title">VN Law RAG</h4>
        <p className="footer__text">Giao diện gateway cho hệ thống microservices pháp luật.</p>
      </div>
      <div className="footer__section">
        <h4 className="footer__title">Liên kết</h4>
        <ul className="footer__list">
          <li>
            <a className="footer__link" href="/terms">
              Điều khoản
            </a>
          </li>
          <li>
            <a className="footer__link" href="/support">
              Hỗ trợ
            </a>
          </li>
          <li>
            <a className="footer__link" href="/privacy">
              Chính sách riêng tư
            </a>
          </li>
        </ul>
      </div>
      <div className="footer__section">
        <h4 className="footer__title">Liên hệ</h4>
        <p className="footer__text">Email: support@example.com</p>
        <p className="footer__text">© 2025 VN Law RAG. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
