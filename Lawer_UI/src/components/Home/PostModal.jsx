import './HomeShared.css';

const PostModal = ({
  open,
  onClose,
  firstLetter,
  displayName,
  postContent,
  setPostContent,
  postFiles,
  setPostFiles,
  postError,
  postLoading,
  onSubmit,
}) => {
  if (!open) return null;
  return (
    <div className="home-modal__overlay" onClick={onClose}>
      <div className="home-modal home-modal--dark" onClick={(e) => e.stopPropagation()}>
        <div className="home-modal__header">
          <h3>Tạo bài viết</h3>
          <button type="button" className="home-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="home-modal__user">
          <div className="home-modal__avatar">{firstLetter}</div>
          <div className="home-modal__user-text">
            <div className="home-modal__user-name">{displayName || 'Người dùng'}</div>
            <div className="home-modal__pill">Công khai</div>
          </div>
        </div>
        <form className="home-modal__form" onSubmit={onSubmit}>
          <textarea
            placeholder="Bạn đang nghĩ gì vậy?"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
          />
          <div className="home-modal__attach">
            <span>Thêm vào bài viết của bạn</span>
            <div className="home-modal__icons">
              <label className="home-modal__icon-btn">
                📷
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => setPostFiles(Array.from(e.target.files || []))}
                />
              </label>
              <button type="button" className="home-modal__icon-btn" title="Cảm xúc">
                🙂
              </button>
              <button type="button" className="home-modal__icon-btn" title="Vị trí">
                📍
              </button>
              <button type="button" className="home-modal__icon-btn" title="GIF">
                GIF
              </button>
            </div>
          </div>
          {postFiles.length > 0 && (
            <div className="home-modal__files">
              {postFiles.map((file) => (
                <div key={file.name} className="home-modal__file">
                  {file.name}
                </div>
              ))}
            </div>
          )}
          {postError && <div className="home-modal__error">{postError}</div>}
          <div className="home-modal__actions">
            <button type="button" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" disabled={postLoading}>
              {postLoading ? 'Đang đăng...' : 'Đăng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostModal;
