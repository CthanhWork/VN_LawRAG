import { serviceBaseUrls } from '../../configs/serviceMap';
import './HomeShared.css';

const CommentModal = ({
  post,
  commentState,
  commentInput,
  onChangeInput,
  onSubmit,
  onClose,
}) => {
  if (!post) return null;
  const list = commentState?.list || [];

  return (
    <div className="home-modal__overlay" onClick={onClose}>
      <div className="home-modal home-modal--comments" onClick={(e) => e.stopPropagation()}>
        <div className="home-modal__header">
          <div>
            <div className="home-feed__name">Người dùng #{post.authorId}</div>
            <div className="home-feed__muted">
              {post.createdAt ? new Date(post.createdAt).toLocaleString() : 'Vừa xong'}
            </div>
          </div>
          <button type="button" onClick={onClose}>
            Đóng
          </button>
        </div>
        <p className="home-feed__content">{post.content}</p>
        {post.media?.length > 0 && (
          <div
            className="home-feed__media"
            style={{
              backgroundImage: `url(${
                post.media[0].url?.startsWith('http')
                  ? post.media[0].url
                  : `${serviceBaseUrls.social || ''}${post.media[0].url || ''}`
              })`,
            }}
          />
        )}
        <div className="home-feed__comments">
          {commentState?.loading && <div className="home-feed__comment-loading">Đang tải bình luận...</div>}
          {commentState?.error && <div className="home-feed__comment-error">{commentState.error}</div>}
          {!commentState?.loading && !commentState?.error && list.length === 0 && (
            <div className="home-feed__comment-empty">Chưa có bình luận</div>
          )}
          {!commentState?.loading &&
            !commentState?.error &&
            list.map((cmt) => (
              <div key={cmt.id} className="home-feed__comment">
                <div className="home-feed__comment-avatar">{String(cmt.authorId || 'U').slice(0, 2)}</div>
                <div className="home-feed__comment-body">
                  <div className="home-feed__comment-meta">
                    <span className="home-feed__comment-author">Người dùng #{cmt.authorId}</span>
                    <span className="home-feed__comment-time">
                      {cmt.createdAt ? new Date(cmt.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                  <div className="home-feed__comment-text">{cmt.content}</div>
                </div>
              </div>
            ))}
          <form
            className="home-feed__comment-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(post.id);
            }}
          >
            <input
              className="home-feed__comment-input"
              placeholder="Viết bình luận..."
              value={commentInput || ''}
              onChange={(e) => onChangeInput(post.id, e.target.value)}
            />
            <button type="submit">Gửi</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
