import { useContext, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Link } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import {
  getMyPosts,
  likePost,
  unlikePost,
  updatePostVisibility,
} from '../../services/postService';
import { getComments, addComment } from '../../services/commentService';
import PostList from '../../components/Home/PostList';
import CommentModal from '../../components/Home/CommentModal';
import '../../components/Home/HomeShared.css';
import './Profile.css';

const Profile = () => {
  const { user, isLogin } = useContext(UserContext);
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
  const tokenInfo = useMemo(() => {
    try {
      return token ? jwtDecode(token) : null;
    } catch (err) {
      console.error('Decode token failed', err);
      return null;
    }
  }, [token]);
  console.log('profile token debug', tokenInfo, token ? `${token.slice(0, 12)}...${token.slice(-8)}` : '');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState({});
  const [commentModalPost, setCommentModalPost] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [filter, setFilter] = useState('ALL');

  const firstLetter = useMemo(
    () => (user?.displayName || user?.email || 'U')[0].toUpperCase(),
    [user],
  );

  const totalLikes = useMemo(
    () => posts.reduce((sum, p) => sum + (p.likeCount || 0), 0),
    [posts],
  );

  const totalComments = useMemo(
    () => posts.reduce((sum, p) => sum + (p.commentCount || 0), 0),
    [posts],
  );

  // --- Load My Posts ---
  useEffect(() => {
    const load = async () => {
      if (!isLogin) return;
      setLoading(true);
      setError('');

      try {
        const res = await getMyPosts({ page: 0, size: 12 });
        const payload = res?.data || res || {};
        console.log('getMyPosts response', payload);
        const items = payload.content || payload?.data?.content || [];
        setPosts(items);
      } catch (err) {
        const serverMessage =
          err?.response?.data?.message ||
          err?.message ||
          'Không tải được danh sách bài viết của bạn.';
        setError(serverMessage);
        console.error('getMyPosts failed', err?.response || err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLogin]);

  // --- Load Comments ---
  const loadComments = async (postId) => {
    setComments((prev) => ({
      ...prev,
      [postId]: { ...(prev[postId] || {}), loading: true, error: '' },
    }));

    try {
      const res = await getComments(postId, { page: 0, size: 10 });
      const items = res?.data?.content || res?.content || [];
      const pagination = {
        page: res?.data?.page ?? res?.page ?? 0,
        hasNext: res?.data?.hasNext ?? res?.hasNext ?? false,
      };

      setComments((prev) => ({
        ...prev,
        [postId]: { list: items, loading: false, error: '', ...pagination },
      }));
    } catch (err) {
      setComments((prev) => ({
        ...prev,
        [postId]: {
          ...(prev[postId] || {}),
          loading: false,
          error: 'Không tải được bình luận.',
        },
      }));
    }
  };

  const openCommentsModal = (post) => {
    setCommentModalPost(post);
    if (!comments[post.id]) loadComments(post.id);
  };

  // --- Like / Unlike ---
  const toggleLike = async (postId, liked) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedByCurrentUser: !liked,
              likeCount: (p.likeCount || 0) + (liked ? -1 : 1),
            }
          : p,
      ),
    );

    try {
      const res = liked ? await unlikePost(postId) : await likePost(postId);
      const totalLikesFromServer = res?.data ?? res;

      if (typeof totalLikesFromServer === 'number') {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, likeCount: totalLikesFromServer } : p,
          ),
        );
      }
    } catch (err) {
      // Rollback
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likedByCurrentUser: liked,
                likeCount: (p.likeCount || 0) + (liked ? 1 : -1),
              }
            : p,
        ),
      );
    }
  };

  // --- Change Visibility ---
  const handleVisibilityChange = async (postId, visibility) => {
    const prevPosts = [...posts];
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, visibility } : p)),
    );

    try {
      await updatePostVisibility(postId, visibility);
    } catch (err) {
      setError('Không đổi được quyền riêng tư. Thử lại.');
      setPosts(prevPosts); // rollback nếu lỗi
    }
  };

  // --- Submit Comment ---
  const handleSubmitComment = async (postId) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    // Optimistic local comment
    const tempId = `temp-${Date.now()}`;
    setComments((prev) => ({
      ...prev,
      [postId]: {
        ...(prev[postId] || { list: [] }),
        list: [
          ...(prev[postId]?.list || []),
          {
            id: tempId,
            authorId: user?.id || 0,
            content: text,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    }));

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));

    try {
      const res = await addComment(postId, text);
      const created = res?.data || res;

      if (created?.id) {
        setComments((prev) => ({
          ...prev,
          [postId]: {
            ...(prev[postId] || { list: [] }),
            list: (prev[postId]?.list || []).map((c) =>
              c.id === tempId ? created : c,
            ),
          },
        }));
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, commentCount: (p.commentCount || 0) + 1 }
            : p,
        ),
      );
    } catch (err) {
      // remove temp comment
      setComments((prev) => ({
        ...prev,
        [postId]: {
          ...(prev[postId] || {}),
          list: (prev[postId]?.list || []).filter((c) => c.id !== tempId),
        },
      }));
    }
  };

  const filteredPosts = useMemo(() => {
    if (filter === 'ALL') return posts;
    return posts.filter(
      (p) => (p?.visibility || '').toUpperCase() === filter,
    );
  }, [posts, filter]);

  return (
    <>
      <section className="profile">
        {/* --- User card --- */}
        <div className="profile__user-info-section">
          <div className="profile__avatar-wrapper">
            <div className="profile__avatar-placeholder">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" />
              ) : (
                <span>{firstLetter}</span>
              )}
            </div>
          </div>

          <div className="profile__details">
            <h1 className="profile__details-name">
              {user?.displayName || 'Người dùng ẩn danh'}
            </h1>
            <p className="profile__details-email">
              {user?.email || 'Chưa cập nhật email'}
            </p>
            <p className="profile__details-tagline">
              Đây là góc nhỏ để bạn quản lý bài viết và tương tác trên mạng xã hội pháp lý của mình.
            </p>
          </div>

          <div className="profile__right-block">
            <div className="profile__stats-bar">
              <div className="profile__stat-item">
                <span className="profile__stat-value">{posts.length}</span>
                <span className="profile__stat-label">Bài viết</span>
              </div>
              <div className="profile__stat-item">
                <span className="profile__stat-value">{totalLikes}</span>
                <span className="profile__stat-label">Lượt thích</span>
              </div>
              <div className="profile__stat-item">
                <span className="profile__stat-value">{totalComments}</span>
                <span className="profile__stat-label">Bình luận</span>
              </div>
            </div>

            <Link
              className="profile__action-btn profile__action-btn--settings"
              to="/settings"
            >
              ⚙️ Cài đặt tài khoản
            </Link>
          </div>
        </div>

        {/* --- Posts area --- */}
        <div className="profile__posts-section">
          <div className="profile__posts-header">
            <div>
              <h2 className="profile__section-title">Bài viết của bạn</h2>
              <p className="profile__section-subtitle">
                Xem lại, lọc quyền riêng tư và tương tác với các bài viết đã đăng.
              </p>
            </div>

            <div className="profile__filter">
              <label htmlFor="profile-filter">Hiển thị</label>
              <select
                id="profile-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="ALL">Tất cả</option>
                <option value="PUBLIC">Công khai</option>
                <option value="PRIVATE">Chỉ mình tôi</option>
              </select>
            </div>
          </div>

          <PostList
            posts={filteredPosts}
            loading={loading}
            error={error}
            onLike={toggleLike}
            onOpenComments={openCommentsModal}
            currentUserInitial={firstLetter}
            onChangeVisibility={handleVisibilityChange}
            canEditVisibility
          />
        </div>
      </section>

      <CommentModal
        post={commentModalPost}
        commentState={commentModalPost ? comments[commentModalPost.id] : null}
        commentInput={commentModalPost ? commentInputs[commentModalPost.id] : ''}
        onChangeInput={(postId, val) =>
          setCommentInputs((prev) => ({ ...prev, [postId]: val }))
        }
        onSubmit={handleSubmitComment}
        currentUserAvatar={user?.avatarUrl}
        currentUserName={user?.displayName}
        onClose={() => setCommentModalPost(null)}
      />
    </>
  );
};

export default Profile;
