import { useEffect, useState } from 'react';
import adminService from '../../../services/adminService';
import Pager from './Pager';
import { formatDate, pickError, truncate } from '../shared';

const VISIBILITY_OPTIONS = ['PUBLIC', 'PRIVATE'];
const PAGE_SIZE = 10;

const PostsPanel = () => {
  const [search, setSearch] = useState({ authorId: '', visibility: '' });
  const [filters, setFilters] = useState({ authorId: '', visibility: '' });
  const [listState, setListState] = useState({
    items: [],
    loading: false,
    error: '',
    page: 0,
    size: PAGE_SIZE,
    hasNext: false,
    hasPrevious: false,
    total: 0,
    totalPages: 0,
  });
  const [selectedPost, setSelectedPost] = useState(null);
  const [detailState, setDetailState] = useState({
    loading: false,
    saving: false,
    deleting: false,
    error: '',
    message: '',
    visibilityInput: VISIBILITY_OPTIONS[0],
  });
  const [comments, setComments] = useState({});

  const fetchPosts = async (page = 0) => {
    setListState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const payload = { ...filters, page, size: PAGE_SIZE };
      if (payload.authorId === '') {
        delete payload.authorId;
      }
      const res = await adminService.listPosts(payload);
      const data = res?.data || {};
      setListState((prev) => ({
        ...prev,
        loading: false,
        items: data.content || [],
        page: data.page ?? page,
        size: data.size ?? prev.size,
        hasNext: Boolean(data.hasNext),
        hasPrevious: Boolean(data.hasPrevious),
        total: data.totalElements ?? prev.total,
        totalPages: data.totalPages ?? prev.totalPages,
      }));
    } catch (err) {
      setListState((prev) => ({
        ...prev,
        loading: false,
        error: pickError(err, 'Khong tai duoc bai viet'),
      }));
    }
  };

  useEffect(() => {
    fetchPosts(0);
  }, [filters]);

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setFilters(search);
    setSelectedPost(null);
  };

  const handleResetFilters = () => {
    const cleared = { authorId: '', visibility: '' };
    setSearch(cleared);
    setFilters(cleared);
    setSelectedPost(null);
  };

  const loadComments = async (postId) => {
    if (!postId) return;
    setComments((prev) => ({
      ...prev,
      [postId]: { ...(prev[postId] || {}), loading: true, error: '' },
    }));
    try {
      const res = await adminService.listComments(postId, { page: 0, size: 20 });
      const data = res?.data || {};
      setComments((prev) => ({
        ...prev,
        [postId]: {
          list: data.content || [],
          loading: false,
          error: '',
          page: data.page ?? 0,
          hasNext: Boolean(data.hasNext),
        },
      }));
    } catch (err) {
      setComments((prev) => ({
        ...prev,
        [postId]: { ...(prev[postId] || {}), loading: false, error: pickError(err, 'Khong tai duoc binh luan') },
      }));
    }
  };

  const handleSelectPost = async (post) => {
    if (!post?.id) return;
    setSelectedPost(post);
    setDetailState((prev) => ({
      ...prev,
      loading: true,
      message: '',
      error: '',
      visibilityInput: post.visibility || prev.visibilityInput,
    }));
    try {
      const res = await adminService.getPost(post.id);
      const data = res?.data || post;
      setSelectedPost(data);
      setDetailState((prev) => ({
        ...prev,
        loading: false,
        visibilityInput: data.visibility || prev.visibilityInput,
      }));
    } catch (err) {
      setDetailState((prev) => ({
        ...prev,
        loading: false,
        error: pickError(err, 'Khong tai duoc bai viet'),
      }));
    }
    loadComments(post.id);
  };

  const handleUpdateVisibility = async () => {
    if (!selectedPost) return;
    setDetailState((prev) => ({ ...prev, saving: true, message: '', error: '' }));
    try {
      const res = await adminService.updatePostVisibility(selectedPost.id, detailState.visibilityInput);
      const updated = res?.data || selectedPost;
      setSelectedPost(updated);
      setListState((prev) => ({
        ...prev,
        items: prev.items.map((p) =>
          p.id === updated.id ? { ...p, visibility: updated.visibility } : p,
        ),
      }));
      setDetailState((prev) => ({ ...prev, saving: false, message: 'Da cap nhat hien thi' }));
    } catch (err) {
      setDetailState((prev) => ({
        ...prev,
        saving: false,
        error: pickError(err, 'Khong cap nhat duoc hien thi'),
      }));
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    const confirmed = window.confirm('Xoa bai viet? Khong the khoi phuc.');
    if (!confirmed) return;
    setDetailState((prev) => ({ ...prev, deleting: true, message: '', error: '' }));
    try {
      await adminService.deletePost(selectedPost.id);
      setListState((prev) => ({
        ...prev,
        items: prev.items.filter((p) => p.id !== selectedPost.id),
        total: Math.max(0, (prev.total || 1) - 1),
      }));
      setComments((prev) => {
        const next = { ...prev };
        delete next[selectedPost.id];
        return next;
      });
      setSelectedPost(null);
      setDetailState((prev) => ({ ...prev, deleting: false, message: 'Da xoa bai' }));
    } catch (err) {
      setDetailState((prev) => ({
        ...prev,
        deleting: false,
        error: pickError(err, 'Khong xoa duoc bai'),
      }));
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!selectedPost?.id) return;
    setComments((prev) => ({
      ...prev,
      [selectedPost.id]: { ...(prev[selectedPost.id] || {}), deleting: commentId },
    }));
    try {
      await adminService.deleteComment(selectedPost.id, commentId);
      setComments((prev) => ({
        ...prev,
        [selectedPost.id]: {
          ...(prev[selectedPost.id] || {}),
          deleting: null,
          list: (prev[selectedPost.id]?.list || []).filter((c) => c.id !== commentId),
        },
      }));
    } catch (err) {
      setDetailState((prev) => ({ ...prev, error: pickError(err, 'Khong xoa duoc binh luan') }));
      setComments((prev) => ({
        ...prev,
        [selectedPost.id]: { ...(prev[selectedPost.id] || {}), deleting: null },
      }));
    }
  };

  const selectedComments = selectedPost ? comments[selectedPost.id] : null;

  return (
    <div className="admin__panel">
      <form className="admin__filters" onSubmit={handleApplyFilters}>
        <label className="admin__filter">
          <span>ID tac gia</span>
          <input
            type="number"
            min="0"
            placeholder="Tat ca"
            value={search.authorId}
            onChange={(e) => setSearch((prev) => ({ ...prev, authorId: e.target.value }))}
          />
        </label>
        <label className="admin__filter">
          <span>Che do hien thi</span>
          <select
            value={search.visibility}
            onChange={(e) => setSearch((prev) => ({ ...prev, visibility: e.target.value }))}
          >
            <option value="">Tat ca</option>
            {VISIBILITY_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="admin__filter admin__filter--actions">
          <button type="submit" className="admin__btn">
            Loc
          </button>
          <button type="button" className="admin__btn admin__btn--ghost" onClick={handleResetFilters}>
            Xoa loc
          </button>
        </div>
      </form>

      <div className="admin__grid">
        <div className="admin__card">
          <div className="admin__card-header">
            <div>
              <div className="admin__eyebrow">Bai viet</div>
              <div className="admin__card-title">Danh sach bai viet</div>
            </div>
            <div className="admin__card-actions">
              <button
                type="button"
                className="admin__btn admin__btn--ghost"
                onClick={() => fetchPosts(listState.page)}
                disabled={listState.loading}
              >
                Tai lai
              </button>
              <Pager state={listState} onPrev={() => fetchPosts(listState.page - 1)} onNext={() => fetchPosts(listState.page + 1)} />
            </div>
          </div>

          {listState.error && <div className="admin__alert admin__alert--error">{listState.error}</div>}
          <div className="admin__table-wrapper">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tac gia</th>
                  <th>Che do</th>
                  <th>Luot thich</th>
                  <th>Binh luan</th>
                  <th>Cap nhat</th>
                </tr>
              </thead>
              <tbody>
                {listState.loading ? (
                  <tr>
                    <td colSpan="6" className="admin__muted">
                      Dang tai bai viet...
                    </td>
                  </tr>
                ) : listState.items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="admin__muted">
                      Khong co bai viet.
                    </td>
                  </tr>
                ) : (
                  listState.items.map((post) => (
                    <tr
                      key={post.id}
                      className={selectedPost?.id === post.id ? 'is-selected' : ''}
                      onClick={() => handleSelectPost(post)}
                    >
                      <td title={truncate(post.content)} className="admin__ellipsis">
                        #{post.id} {truncate(post.content, 40)}
                      </td>
                      <td>#{post.authorId}</td>
                      <td>
                        <span
                          className={`pill pill--${(post.visibility || '').toLowerCase() || 'muted'}`}
                        >
                          {post.visibility || 'N/A'}
                        </span>
                      </td>
                      <td>{post.likeCount ?? 0}</td>
                      <td>{post.commentCount ?? 0}</td>
                      <td>{formatDate(post.updatedAt || post.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin__card admin__card--detail">
          <div className="admin__card-header">
            <div>
              <div className="admin__eyebrow">Chi tiet bai viet</div>
              <div className="admin__card-title">
                {selectedPost ? `Bai #${selectedPost.id}` : 'Chon bai viet'}
              </div>
            </div>
            {selectedPost && (
              <span className="pill pill--outline">{selectedPost.visibility || 'UNKNOWN'}</span>
            )}
          </div>

          {!selectedPost ? (
            <p className="admin__muted">Chon bai viet de xem quyen hien thi va binh luan.</p>
          ) : (
            <>
              <div className="admin__meta admin__meta--grid">
                <div>
                  <div className="admin__label">Tac gia</div>
                  <div className="admin__value">#{selectedPost.authorId}</div>
                </div>
                <div>
                  <div className="admin__label">Luot thich</div>
                  <div className="admin__value">{selectedPost.likeCount ?? 0}</div>
                </div>
                <div>
                  <div className="admin__label">Binh luan</div>
                  <div className="admin__value">{selectedPost.commentCount ?? 0}</div>
                </div>
                <div>
                  <div className="admin__label">Tao</div>
                  <div className="admin__value">{formatDate(selectedPost.createdAt)}</div>
                </div>
                <div>
                  <div className="admin__label">Cap nhat</div>
                  <div className="admin__value">{formatDate(selectedPost.updatedAt)}</div>
                </div>
              </div>

              <div className="admin__post-content">
                <div className="admin__label">Noi dung</div>
                <div className="admin__value admin__value--box">{selectedPost.content || '(Khong co noi dung)'}</div>
              </div>

              {detailState.error && <div className="admin__alert admin__alert--error">{detailState.error}</div>}
              {detailState.message && (
                <div className="admin__alert admin__alert--success">{detailState.message}</div>
              )}

              <div className="admin__form admin__form--split">
                <label>
                  <span>Che do hien thi</span>
                  <select
                    value={detailState.visibilityInput}
                    onChange={(e) => setDetailState((prev) => ({ ...prev, visibilityInput: e.target.value }))}
                  >
                    {VISIBILITY_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="admin__btn"
                  onClick={handleUpdateVisibility}
                  disabled={detailState.saving || detailState.loading}
                >
                  {detailState.saving ? 'Dang luu...' : 'Cap nhat hien thi'}
                </button>
                <button
                  type="button"
                  className="admin__btn admin__btn--danger"
                  onClick={handleDeletePost}
                  disabled={detailState.deleting}
                >
                  {detailState.deleting ? 'Dang xoa...' : 'Xoa bai'}
                </button>
              </div>

              <div className="admin__comments">
                <div className="admin__card-header">
                  <div>
                    <div className="admin__eyebrow">Binh luan</div>
                    <div className="admin__card-title">
                      {selectedComments?.list?.length || 0} binh luan
                    </div>
                  </div>
                  <button
                    type="button"
                    className="admin__btn admin__btn--ghost"
                    onClick={() => loadComments(selectedPost.id)}
                    disabled={selectedComments?.loading}
                  >
                    Tai lai binh luan
                  </button>
                </div>

                {selectedComments?.error && (
                  <div className="admin__alert admin__alert--error">{selectedComments.error}</div>
                )}

                <div className="admin__comment-list">
                  {selectedComments?.loading ? (
                    <div className="admin__muted">Dang tai binh luan...</div>
                  ) : selectedComments?.list?.length ? (
                    selectedComments.list.map((comment) => (
                      <div key={comment.id} className="admin__comment">
                        <div>
                          <div className="admin__label">#{comment.id}</div>
                          <div className="admin__value admin__value--box">{comment.content}</div>
                          <div className="admin__muted">
                            Tac gia #{comment.authorId} - {formatDate(comment.createdAt)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="admin__btn admin__btn--danger"
                          disabled={selectedComments?.deleting === comment.id}
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          {selectedComments?.deleting === comment.id ? 'Dang xoa...' : 'Xoa'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="admin__muted">Khong co binh luan.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostsPanel;
