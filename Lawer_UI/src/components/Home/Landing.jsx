import { Link } from 'react-router-dom';
import './HomeShared.css';

const Landing = () => (
  <section className="home-landing page-card">
    <div className="home-landing__left">
      <h1 className="home-landing__title">Cập nhật pháp luật thân thiện</h1>
      <p className="home-landing__desc">
        Theo dõi tin pháp lý, lưu tài liệu quan trọng và trò chuyện cùng cộng đồng. Mọi thứ tập trung tại VN
        Law RAG.
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
        <li>Đọc và chia sẻ bài viết pháp luật</li>
        <li>Tìm kiếm, lưu trữ văn bản bạn cần</li>
        <li>Trao đổi, hỏi đáp với cộng đồng</li>
      </ul>
    </div>
    <div className="home-landing__right">
      <div className="home-landing__mock">
        <div className="home-landing__mock-header" />
        <div className="home-landing__mock-post" />
        <div className="home-landing__mock-post" />
        <div className="home-landing__mock-post" />
      </div>
    </div>
  </section>
);

export default Landing;
