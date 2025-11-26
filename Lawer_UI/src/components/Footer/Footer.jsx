import './Footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="shell-container footer__container">
      <div className="footer__section">
        <h4 className="footer__title">VN Law RAG</h4>
        <p className="footer__text">Giao dien gateway cho he thong microservices phap luat.</p>
      </div>
      <div className="footer__section">
        <h4 className="footer__title">Lien ket</h4>
        <ul className="footer__list">
          <li>
            <a className="footer__link" href="/terms">
              Dieu khoan
            </a>
          </li>
          <li>
            <a className="footer__link" href="/support">
              Ho tro
            </a>
          </li>
          <li>
            <a className="footer__link" href="/privacy">
              Chinh sach rieng tu
            </a>
          </li>
        </ul>
      </div>
      <div className="footer__section">
        <h4 className="footer__title">Lien he</h4>
        <p className="footer__text">Email: support@example.com</p>
        <p className="footer__text">© 2025 VN Law RAG. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
