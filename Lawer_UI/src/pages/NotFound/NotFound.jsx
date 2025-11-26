import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => (
  <section className="notfound page-card">
    <div className="notfound__code">404</div>
    <h1 className="notfound__title">Khong tim thay trang</h1>
    <p className="notfound__desc">
      Duong dan ban truy cap khong ton tai hoac da duoc di chuyen. Quay lai trang chu de tiep tuc.
    </p>
    <Link className="notfound__cta" to="/">
      Ve trang chu
    </Link>
  </section>
);

export default NotFound;
