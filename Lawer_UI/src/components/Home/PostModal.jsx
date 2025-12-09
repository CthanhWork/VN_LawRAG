import { CloseIcon, EmojiIcon, GifIcon, ImageIcon, TagIcon, GlobeIcon } from './BentoIcons';
import AvatarBadge from './AvatarBadge';
import './HomeShared.css';

const PostModal = ({
  open,
  onClose,
  firstLetter,
  displayName,
  avatarUrl,
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
          <h3 className="home-feed__name">Chia sẻ cảm xúc</h3>
          <button type="button" className="home-modal__close" onClick={onClose} aria-label="Đóng">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="home-modal__user">
          <AvatarBadge src={avatarUrl} fallback={firstLetter} size="small" title={displayName} />
          <div className="home-modal__user-text">
            <div className="home-modal__user-name">{displayName || 'Người dùng'}</div>
            <div className="home-pill">
              <GlobeIcon size={14} />
              Công khai
            </div>
          </div>
        </div>

        <form className="home-modal__form" onSubmit={onSubmit}>
          <textarea
            placeholder="Bạn đang nghĩ gì?"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
          />

          <label className="home-modal__attach">
            <span className="home-feed__name" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={18} />
              Thêm ảnh/video (tối đa 3)
            </span>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => {
                const selected = Array.from(e.target.files || []).slice(0, 3);
                setPostFiles(selected);
              }}
            />
            <div className="home-modal__icons">
              <span className="home-modal__icon-btn" title="Sticker">
                <GifIcon size={18} />
              </span>
              <span className="home-modal__icon-btn" title="Biểu tượng cảm xúc">
                <EmojiIcon size={18} />
              </span>
              <span className="home-modal__icon-btn" title="Thẻ gắn">
                <TagIcon size={18} />
              </span>
            </div>
            <div className="home-feed__muted" style={{ fontSize: '12px', marginTop: '4px' }}>
              Chọn tối đa 3 tệp media cho mỗi bài viết.
            </div>
          </label>

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
              {postLoading ? 'Đang đăng...' : 'Đăng bài'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostModal;
