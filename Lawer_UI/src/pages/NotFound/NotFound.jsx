import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => (
  <section className="notfound page-card">
    <div className="notfound__code">404</div>
    <h1 className="notfound__title">Không tìm thấy trang</h1>
    <p className="notfound__desc">
      Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển. Quay lại trang chủ để tiếp tục.
    </p>
    <Link className="notfound__cta" to="/">
      Về trang chủ
    </Link>
  </section>
);

export default NotFound;
