import { serviceBaseUrls } from '../../configs/serviceMap';
import { CloseIcon, SendIcon } from './BentoIcons';
import AvatarBadge from './AvatarBadge';
import './HomeShared.css';

const formatTime = (value) => {
  if (!value) return 'Just now';
  try {
    return new Date(value).toLocaleString('vi-VN', { hour12: false });
  } catch (e) {
    return 'Just now';
  }
};

const CommentModal = ({
  post,
  commentState,
  commentInput,
  onChangeInput,
  onSubmit,
  currentUserAvatar,
  currentUserName,
  onClose,
}) => {
  if (!post) return null;

  const list = commentState?.list || [];
  const authorName = post.authorName || post.author?.displayName || `User #${post.authorId}`;
  const authorAvatar = post.authorAvatarUrl || post.author?.avatarUrl;
  const authorInitial = (authorName || 'U')[0]?.toUpperCase();
  const currentInitial = (currentUserName || 'U')[0]?.toUpperCase();
  const commenterAvatar = currentUserAvatar || authorAvatar;

  const renderMedia = () => {
    if (!post.media || !post.media.length) return null;
    const items = Array.isArray(post.media) ? post.media : [post.media];
    return (
      <div className="home-modal__media-grid">
        {items.map((media) => {
          const isVideo =
            media.mediaType === 'VIDEO' || (media.mimeType && media.mimeType.toLowerCase().includes('video'));
          const mediaUrl = media.url?.startsWith('http')
            ? media.url
            : `${serviceBaseUrls.social || ''}${media.url || ''}`;
          return (
            <div key={media.id || media.url} className="home-feed__media home-modal__media">
              {isVideo ? <video src={mediaUrl} controls /> : <img src={mediaUrl} alt="Media" loading="lazy" />}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="home-modal__overlay" onClick={onClose}>
      <div className="home-modal home-modal--comments" onClick={(e) => e.stopPropagation()}>
        <div className="home-modal__header">
          <div className="home-comment__head">
            <AvatarBadge src={authorAvatar} fallback={authorInitial} size="small" title={authorName} />
            <div>
              <div className="home-feed__name">{authorName}</div>
              <div className="home-feed__muted">{formatTime(post.createdAt)}</div>
            </div>
          </div>
          <button type="button" className="home-modal__close" onClick={onClose} aria-label="Đóng bình luận">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="home-modal__content home-modal__content--comments">
          <div className="home-comments__panel">
            <div className="home-comments__scroll">
              <div className="home-modal__post home-modal__post--compact">
                {post.content && <p className="home-card__content">{post.content}</p>}
                {renderMedia()}
              </div>

              {commentState?.loading && <div className="home-feed__comment-loading">Đang tải bình luận...</div>}
              {commentState?.error && <div className="home-feed__comment-error">{commentState.error}</div>}
              {!commentState?.loading && !commentState?.error && list.length === 0 && (
                <div className="home-feed__comment-empty">Chưa có bình luận</div>
              )}
              {!commentState?.loading &&
                !commentState?.error &&
                list.map((cmt) => {
                  const name = cmt.authorName || `User #${cmt.authorId}`;
                  const initial = (name || 'U')[0]?.toUpperCase();
                  return (
                    <div key={cmt.id} className="home-feed__comment">
                      <AvatarBadge src={cmt.authorAvatarUrl} fallback={initial} size="small" title={name} />
                      <div className="home-feed__comment-body">
                        <div className="home-feed__comment-meta">
                          <span className="home-feed__comment-author">{name}</span>
                          <span className="home-feed__comment-time">{formatTime(cmt.createdAt)}</span>
                        </div>
                        <div className="home-feed__comment-text">{cmt.content}</div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <form
              className="home-feed__comment-form home-comment__form"
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit(post.id);
              }}
            >
              <AvatarBadge src={commenterAvatar} fallback={currentInitial} size="small" title={currentUserName || authorName} />
              <input
                className="home-feed__comment-input"
                placeholder="Viết bình luận..."
                value={commentInput || ''}
                onChange={(e) => onChangeInput(post.id, e.target.value)}
              />
              <button type="submit">
                <SendIcon size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
