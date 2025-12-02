import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import { getMyPosts, likePost, unlikePost, updatePostVisibility } from '../../services/postService';
import { getComments, addComment } from '../../services/commentService';
import PostList from '../../components/Home/PostList';
import CommentModal from '../../components/Home/CommentModal';
import '../../components/Home/HomeShared.css';
import './Profile.css';

const Profile = () => {
  const { user, isLogin } = useContext(UserContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState({});
  const [commentModalPost, setCommentModalPost] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

  const firstLetter = useMemo(
    () => (user?.displayName || user?.email || 'U')[0].toUpperCase(),
    [user],
  );

  useEffect(() => {
    const load = async () => {
      if (!isLogin) return;
      setLoading(true);
      setError('');
      try {
        const res = await getMyPosts({ page: 0, size: 12 });
        const payload = res?.data || res || {};
        const items = payload.content || payload?.data?.content || [];
        setPosts(items);
      } catch (err) {
        setError('Không tải được danh sách bài viết của bạn.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLogin]);

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
        [postId]: { ...(prev[postId] || {}), loading: false, error: 'Không tải được bình luận.' },
      }));
    }
  };

  const openCommentsModal = (post) => {
    setCommentModalPost(post);
    if (!comments[post.id]) {
      loadComments(post.id);
    }
  };

  const toggleLike = async (postId, liked) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likedByCurrentUser: !liked, likeCount: (p.likeCount || 0) + (liked ? -1 : 1) }
          : p,
      ),
    );
    try {
      const res = liked ? await unlikePost(postId) : await likePost(postId);
      const totalLikes = res?.data ?? res;
      if (typeof totalLikes === 'number') {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likeCount: totalLikes } : p)));
      }
    } catch (err) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likedByCurrentUser: liked, likeCount: (p.likeCount || 0) + (liked ? 1 : -1) }
            : p,
        ),
      );
    }
  };

  const handleVisibilityChange = async (postId, visibility) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, visibility } : p)));
    try {
      await updatePostVisibility(postId, visibility);
    } catch (err) {
      setError('Không đổi được quyền riêng tư. Thử lại.');
    }
  };

  const handleSubmitComment = async (postId) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    setComments((prev) => ({
      ...prev,
      [postId]: {
        ...(prev[postId] || { list: [] }),
        list: [
          ...(prev[postId]?.list || []),
          {
            id: `temp-${Date.now()}`,
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
              String(c.id).startsWith('temp-') ? created : c,
            ),
          },
        }));
      }
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p)),
      );
    } catch (err) {
      setComments((prev) => ({
        ...prev,
        [postId]: {
          ...(prev[postId] || {}),
          list: (prev[postId]?.list || []).filter((c) => !String(c.id).startsWith('temp-')),
        },
      }));
    }
  };

  return (
    <>
      <section className="profile page-card">
        <div className="profile__header">
          <div>
            <p className="profile__eyebrow">Trang cá nhân</p>
            <h1 className="profile__title">Bài viết của tôi</h1>
            <p className="profile__subtitle">Xem lại và tương tác với nội dung bạn đã đăng.</p>
          </div>
          <div className="profile__actions">
            <Link className="profile__action-btn" to="/settings">
              Cài đặt tài khoản
            </Link>
          </div>
        </div>

        <div className="profile__meta">
          <div className="profile__pill">Tên: {user?.displayName || 'Chưa đặt'}</div>
          <div className="profile__pill">Email: {user?.email || 'Chưa có'}</div>
          <div className="profile__pill">Tổng bài viết: {posts.length}</div>
        </div>
      </section>

      <section className="profile__posts">
        <PostList
          posts={posts}
          loading={loading}
          error={error}
          onLike={toggleLike}
          onOpenComments={openCommentsModal}
          currentUserInitial={firstLetter}
          onChangeVisibility={handleVisibilityChange}
          canEditVisibility
        />
      </section>

      <CommentModal
        post={commentModalPost}
        commentState={commentModalPost ? comments[commentModalPost.id] : null}
        commentInput={commentModalPost ? commentInputs[commentModalPost.id] : ''}
        onChangeInput={(postId, val) => setCommentInputs((prev) => ({ ...prev, [postId]: val }))}
        onSubmit={handleSubmitComment}
        onClose={() => setCommentModalPost(null)}
      />
    </>
  );
};

export default Profile;
