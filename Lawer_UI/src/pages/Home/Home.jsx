import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import { getFeed, likePost, unlikePost, createPost } from '../../services/postService';
import { getComments, addComment } from '../../services/commentService';
import Landing from '../../components/Home/Landing';
import ComposerTrigger from '../../components/Home/ComposerTrigger';
import PostList from '../../components/Home/PostList';
import PostModal from '../../components/Home/PostModal';
import CommentModal from '../../components/Home/CommentModal';
import ChatWidget from '../../components/Home/ChatWidget';
import ProgressTimeline from '../../components/Home/ProgressTimeline';
import '../../components/Home/HomeShared.css';

const Home = () => {
  const { isLogin, user, logout } = useContext(UserContext);
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postFiles, setPostFiles] = useState([]);
  const [postError, setPostError] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [comments, setComments] = useState({});
  const [commentModalPost, setCommentModalPost] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

  const firstLetter = useMemo(() => (user?.displayName || 'U')[0].toUpperCase(), [user]);

  useEffect(() => {
    const load = async () => {
      if (!isLogin) return;
      setLoading(true);
      setError('');
      try {
        const res = await getFeed({ page: 0, size: 10 });
        const items = res?.data?.content || [];
        setPosts(items);
      } catch (err) {
        setError('Không tải được bài viết. Kiểm tra API posts/feed.');
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
      const items = res?.data?.content || [];
      const pagination = { page: res?.data?.page ?? 0, hasNext: res?.data?.hasNext ?? false };
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
      const totalLikes = res?.data;
      if (typeof totalLikes === 'number') {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likeCount: totalLikes } : p)));
      }
    } catch (err) {
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

  const handleCreatePost = async (e) => {
    e.preventDefault();
    const content = postContent.trim();
    if (!content) return;
    const files = (postFiles || []).slice(0, 3);
    setPostLoading(true);
    setPostError('');
    try {
      const res = await createPost({ content, visibility: 'PUBLIC', files });
      const newPost = res?.data;
      if (newPost) {
        setPosts((prev) => [newPost, ...prev]);
      }
      setPostContent('');
      setPostFiles([]);
      setPostModalOpen(false);
    } catch (err) {
      const fallback = 'Không đăng được bài. Thử lại.';
      const serverMsg = err?.response?.data?.message;
      setPostError(serverMsg || fallback);
    } finally {
      setPostLoading(false);
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
      const created = res?.data;
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

  if (!isLogin) {
    return <Landing />;
  }

  return (
    <>
      <section className="home-feed">
        <div className="home-feed__timeline">
          <ProgressTimeline />
          <ComposerTrigger
            firstLetter={firstLetter}
            avatarUrl={user?.avatarUrl}
            displayName={user?.displayName}
            onOpen={() => setPostModalOpen(true)}
          />
          <PostList
            posts={posts}
            loading={loading}
            error={error}
            onLike={toggleLike}
            onOpenComments={openCommentsModal}
            currentUserInitial={firstLetter}
          />
        </div>
      </section>

      <ChatWidget />

      <PostModal
        open={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        firstLetter={firstLetter}
        displayName={user?.displayName}
        avatarUrl={user?.avatarUrl}
        postContent={postContent}
        setPostContent={setPostContent}
        postFiles={postFiles}
        setPostFiles={setPostFiles}
        postError={postError}
        postLoading={postLoading}
        onSubmit={handleCreatePost}
      />

      <CommentModal
        post={commentModalPost}
        commentState={commentModalPost ? comments[commentModalPost.id] : null}
        commentInput={commentModalPost ? commentInputs[commentModalPost.id] : ''}
        onChangeInput={(postId, val) => setCommentInputs((prev) => ({ ...prev, [postId]: val }))}
        onSubmit={handleSubmitComment}
        currentUserAvatar={user?.avatarUrl}
        currentUserName={user?.displayName}
        onClose={() => setCommentModalPost(null)}
      />
    </>
  );
};

export default Home;
