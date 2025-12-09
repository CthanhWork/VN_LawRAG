import { Link } from 'react-router-dom';
import './HomeShared.css';

const Landing = () => (
  <section className="home-landing page-card">
    <div className="home-landing__left">
      <h1 className="home-landing__title">Cập nhật pháp luật dễ hiểu, dễ tiếp cận</h1>
      <p className="home-landing__desc">
        Theo dõi tin tức pháp lý, lưu giữ tài liệu quan trọng và kết nối với cộng đồng VN Law RAG.
      </p>

      <div className="home-landing__actions">
        <Link className="home__btn home__btn--primary" to="/login">
          Đăng nhập
        </Link>
        <Link className="home__btn home__btn--ghost" to="/register">
          Tạo tài khoản
        </Link>
      </div>

      <ul className="home-landing__bullets">
        <li>Khám phá và chia sẻ bài viết pháp luật</li>
        <li>Tìm kiếm và lưu trữ văn bản cần thiết</li>
        <li>Đặt câu hỏi, thảo luận cùng cộng đồng</li>
      </ul>
    </div>

    <div className="home-landing__right">
      <div
        className="home-landing__banner"
        style={{ backgroundImage: 'url(/src/assets/Law.jpg)' }}
        aria-label="VN Law banner"
      />
    </div>
  </section>
);

export default Landing;
