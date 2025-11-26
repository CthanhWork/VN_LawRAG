import { serviceBaseUrls } from '../../configs/serviceMap';
import './HomeShared.css';

const PostList = ({ posts, loading, error, onLike, onOpenComments, currentUserInitial }) => {
  if (loading) {
    return (
      <article className="home-feed__post page-card">
        <div className="home-feed__empty">Đang tải bài viết...</div>
      </article>
    );
  }

  if (error) {
    return (
      <article className="home-feed__post page-card">
        <div className="home-feed__empty">{error}</div>
      </article>
    );
  }

  if (posts.length === 0) {
    return (
      <article className="home-feed__post page-card">
        <div className="home-feed__empty">
          <h3>Chưa có bài viết</h3>
          <p>Hãy đăng bài hoặc kết nối API posts/feed để hiển thị.</p>
        </div>
      </article>
    );
  }

  return posts.map((post) => {
    const mediaItems = Array.isArray(post.media) ? post.media : [];
    const liked = post.likedByCurrentUser;
    const resolveUrl = (url) =>
      url?.startsWith('http') ? url : `${serviceBaseUrls.social || ''}${url || ''}`;
    return (
      <article key={post.id} className="home-feed__post card-shadow-dark">
        <div className="home-feed__post-head">
          <div className="home-feed__avatar home-feed__avatar--small">{currentUserInitial}</div>
          <div>
            <div className="home-feed__name">Người dùng #{post.authorId}</div>
            <div className="home-feed__muted">
              {post.createdAt ? new Date(post.createdAt).toLocaleString() : 'Vừa xong'}
            </div>
          </div>
        </div>
        <p className="home-feed__content">{post.content}</p>
        {mediaItems.length > 0 && (
          <div className="home-feed__media-list">
            {mediaItems.map((media) => {
              const isVideo =
                media.mediaType === 'VIDEO' || (media.mimeType && media.mimeType.toLowerCase().includes('video'));
              const mediaUrl = resolveUrl(media.url);
              return (
                <div key={media.id || media.url} className="home-feed__media-item">
                  {isVideo ? (
                    <video src={mediaUrl} controls />
                  ) : (
                    <div className="home-feed__media" style={{ backgroundImage: `url(${mediaUrl})` }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="home-feed__stats">
          <div className="home-feed__stats-left">👍 {post.likeCount || 0}</div>
          <div className="home-feed__stats-right">💬 {post.commentCount || 0}</div>
        </div>
        <div className="home-feed__actions">
          <button type="button" onClick={() => onLike(post.id, liked)}>
            {liked ? '💙 ' : '🤍 '}
            {post.likeCount || 0} Thích
          </button>
          <button type="button" onClick={() => onOpenComments(post)}>
            💬 {post.commentCount || 0} Bình luận
          </button>
          <button type="button">📤 Chia sẻ</button>
        </div>
      </article>
    );
  });
};

export default PostList;
