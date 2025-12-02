import { serviceBaseUrls } from '../../configs/serviceMap';
import { HeartIcon, CommentIcon, ShareIcon, BookmarkIcon, MoreIcon } from './BentoIcons';
import './HomeShared.css';

const formatTime = (value) => {
  if (!value) return 'Vừa xong';
  try {
    return new Date(value).toLocaleString('vi-VN', { hour12: false });
  } catch (e) {
    return 'Vừa xong';
  }
};

const resolveUrl = (url) => (url?.startsWith('http') ? url : `${serviceBaseUrls.social || ''}${url || ''}`);

const PostList = ({
  posts,
  loading,
  error,
  onLike,
  onOpenComments,
  currentUserInitial,
  onChangeVisibility,
  canEditVisibility = false,
}) => {
  if (loading) {
    return (
      <div className="home-feed__posts">
        <article className="home-card">
          <div className="home-feed__empty">Đang tải bài viết...</div>
        </article>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-feed__posts">
        <article className="home-card">
          <div className="home-feed__empty">{error}</div>
        </article>
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className="home-feed__posts">
        <article className="home-card">
          <div className="home-feed__empty">
            <h3>Chưa có bài viết</h3>
            <p>Hãy đăng bài hoặc kiểm tra API posts/feed.</p>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="home-feed__posts">
      {posts.map((post) => {
        const mediaItems = Array.isArray(post.media) ? post.media : [];
        const displayMedia = mediaItems.slice(0, 3);
        const extraCount = mediaItems.length > 3 ? mediaItems.length - 3 : 0;
        const liked = Boolean(post.likedByCurrentUser);
        const authorName = post.authorName || post.author?.displayName || `Người dùng #${post.authorId}`;
        const authorInitial = (authorName || currentUserInitial || 'U')[0]?.toUpperCase();
        const visibility = post.visibility || 'Công khai';

        return (
          <article key={post.id} className="home-card">
            <div className="home-card__header">
              <div className="bento-avatar bento-avatar--small">{authorInitial}</div>
              <div style={{ flex: 1 }}>
                <div className="home-feed__name">{authorName}</div>
                <div className="home-card__meta">
                  <span>{formatTime(post.createdAt)}</span>
                  <span className="home-pill">{visibility}</span>
                </div>
              </div>
              <div className="home-card__meta">
                {canEditVisibility ? (
                  <select
                    className="home-visibility-select"
                    value={post.visibility || 'PUBLIC'}
                    onChange={(e) => onChangeVisibility?.(post.id, e.target.value)}
                  >
                    <option value="PUBLIC">Công khai</option>
                    <option value="PRIVATE">Riêng tư</option>
                  </select>
                ) : (
                  <button className="home-icon-button" type="button" aria-label="Tuỳ chọn">
                    <MoreIcon size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="home-card__body">
              {post.content && <p className="home-card__content">{post.content}</p>}

              {displayMedia.length > 0 && (
                <div className="home-feed__media-grid home-feed__media-grid--capped">
                  {displayMedia.map((media, idx) => {
                    const isVideo =
                      media.mediaType === 'VIDEO' ||
                      (media.mimeType && media.mimeType.toLowerCase().includes('video'));
                    const mediaUrl = resolveUrl(media.url);
                    const isOverflowThumb = extraCount > 0 && idx === displayMedia.length - 1;
                    return (
                      <div key={media.id || media.url || idx} className="home-feed__media">
                        {isVideo ? (
                          <video src={mediaUrl} controls />
                        ) : (
                          <img src={mediaUrl} alt="Media" loading="lazy" />
                        )}
                        {isOverflowThumb && <div className="home-feed__media-overlay">+{extraCount}</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="home-feed__stats">
                <span>Thích {post.likeCount || 0}</span>
                <span>{post.commentCount || 0} bình luận</span>
              </div>
            </div>

            <div className="home-react-bar">
              <button type="button" className={`home-react ${liked ? 'is-active' : ''}`} onClick={() => onLike(post.id, liked)}>
                <HeartIcon size={20} active={liked} />
                <span>{post.likeCount || 0}</span>
              </button>
              <button type="button" className="home-react" onClick={() => onOpenComments(post)}>
                <CommentIcon size={20} />
                <span>{post.commentCount || 0} bình luận</span>
              </button>
              <button type="button" className="home-react">
                <ShareIcon size={20} />
                <span>Chia sẻ</span>
              </button>
              <button type="button" className="home-react" aria-label="Lưu bài viết">
                <BookmarkIcon size={20} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default PostList;
