import { useEffect, useState } from 'react';
import adminService from '../../services/adminService';
import { formatDate, pickError, truncate } from './shared';

const VISIBILITY_CLASSES = {
  PUBLIC: 'bg-success-subtle text-success-emphasis',
  PRIVATE: 'bg-secondary-subtle text-dark',
};

const PAGE_SIZE = 10;

const PostsPage = () => {
  const [filters, setFilters] = useState({ authorId: '', visibility: '' });
  const [list, setList] = useState({
    items: [],
    loading: false,
    error: '',
    page: 0,
    totalPages: 0,
    total: 0,
  });
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState({
    loading: false,
    saving: false,
    deleting: false,
    error: '',
    message: '',
    visibility: 'PUBLIC',
  });
  const [comments, setComments] = useState({ items: [], loading: false, error: '' });

  const fetchPosts = async (page = 0) => {
    setList((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const payload = { ...filters, page, size: PAGE_SIZE };
      if (!payload.authorId) delete payload.authorId;
      const res = await adminService.listPosts(payload);
      const data = res?.data || {};
      setList({
        items: data.content || [],
        loading: false,
        error: '',
        page: data.page ?? page,
        totalPages: data.totalPages ?? 0,
        total: data.totalElements ?? 0,
      });
    } catch (err) {
      setList((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không tải được bài viết') }));
    }
  };

  const selectPost = async (post) => {
    setSelected(post);
    setDetail((prev) => ({ ...prev, loading: true, error: '', message: '', visibility: post.visibility || 'PUBLIC' }));
    try {
      const res = await adminService.getPost(post.id);
      const data = res?.data || post;
      setSelected(data);
      setDetail((prev) => ({
        ...prev,
        loading: false,
        visibility: data.visibility || prev.visibility,
      }));
    } catch (err) {
      setDetail((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không tải được bài viết') }));
    }
    loadComments(post.id);
  };

  const loadComments = async (postId) => {
    setComments((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await adminService.listComments(postId, { page: 0, size: 50 });
      const data = res?.data || {};
      setComments({ items: data.content || [], loading: false, error: '' });
    } catch (err) {
      setComments({ items: [], loading: false, error: pickError(err, 'Không tải được bình luận') });
    }
  };

  const updateVisibility = async () => {
    if (!selected) return;
    setDetail((prev) => ({ ...prev, saving: true, error: '', message: '' }));
    try {
      const res = await adminService.updatePostVisibility(selected.id, detail.visibility);
      const data = res?.data || selected;
      setSelected(data);
      setList((prev) => ({
        ...prev,
        items: prev.items.map((p) => (p.id === data.id ? { ...p, visibility: data.visibility } : p)),
      }));
      setDetail((prev) => ({ ...prev, saving: false, message: 'Đã cập nhật hiển thị' }));
    } catch (err) {
      setDetail((prev) => ({ ...prev, saving: false, error: pickError(err, 'Không cập nhật được hiển thị') }));
    }
  };

  const deletePost = async () => {
    if (!selected) return;
    if (!window.confirm('Xóa bài viết? Hành động này không thể hoàn tác.')) return;
    setDetail((prev) => ({ ...prev, deleting: true, error: '', message: '' }));
    try {
      await adminService.deletePost(selected.id);
      setList((prev) => ({
        ...prev,
        items: prev.items.filter((p) => p.id !== selected.id),
        total: Math.max(0, (prev.total || 1) - 1),
      }));
      setSelected(null);
      setComments({ items: [], loading: false, error: '' });
      setDetail((prev) => ({ ...prev, deleting: false, message: 'Đã xóa bài' }));
    } catch (err) {
      setDetail((prev) => ({ ...prev, deleting: false, error: pickError(err, 'Không xóa được bài') }));
    }
  };

  const deleteComment = async (id) => {
    if (!selected) return;
    try {
      await adminService.deleteComment(selected.id, id);
      setComments((prev) => ({ ...prev, items: prev.items.filter((c) => c.id !== id) }));
    } catch (err) {
      setComments((prev) => ({ ...prev, error: pickError(err, 'Không xóa được bình luận') }));
    }
  };

  useEffect(() => {
    fetchPosts(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const visibilityBadge = (v) => {
    const cls = VISIBILITY_CLASSES[v] || 'bg-secondary-subtle';
    return <span className={`badge badge-pill ${cls}`}>{v || 'N/A'}</span>;
  };

  return (
    <div className="row g-3">
      <div className="col-12">
        <div className="admin-card">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="mb-0">Moderate nội dung xã hội</h6>
            <small className="text-secondary">social-service</small>
          </div>
          <form
            className="row g-2"
            onSubmit={(e) => {
              e.preventDefault();
              fetchPosts(0);
            }}
          >
            <div className="col-md-3">
              <label className="form-label">ID tác giả</label>
              <input
                className="form-control"
                value={filters.authorId}
                onChange={(e) => setFilters((prev) => ({ ...prev, authorId: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Hiển thị</label>
              <select
                className="form-select"
                value={filters.visibility}
                onChange={(e) => setFilters((prev) => ({ ...prev, visibility: e.target.value }))}
              >
                <option value="">Tất cả</option>
                <option value="PUBLIC">PUBLIC</option>
                <option value="PRIVATE">PRIVATE</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-primary w-100" type="submit">
                Lọc
              </button>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button
                className="btn btn-outline-secondary w-100"
                type="button"
                onClick={() => setFilters({ authorId: '', visibility: '' })}
              >
                Xóa lọc
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="col-lg-7">
        <div className="admin-card">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Bài viết</h6>
            <div className="small text-secondary">
              Trang {list.page + 1}/{Math.max(1, list.totalPages || 1)}
            </div>
          </div>
          {list.error && <div className="alert alert-danger py-2">{list.error}</div>}
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Bài viết</th>
                  <th>Tác giả</th>
                  <th>Hiển thị</th>
                  <th>Like</th>
                  <th>BL</th>
                  <th>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {list.loading ? (
                  <tr>
                    <td colSpan="6" className="text-center text-secondary">
                      Đang tải...
                    </td>
                  </tr>
                ) : list.items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-secondary">
                      Không có bài viết
                    </td>
                  </tr>
                ) : (
                  list.items.map((post) => (
                    <tr
                      key={post.id}
                      className={selected?.id === post.id ? 'table-active' : ''}
                      onClick={() => selectPost(post)}
                      role="button"
                    >
                      <td title={post.content}>{`#${post.id} ${truncate(post.content, 40)}`}</td>
                      <td>#{post.authorId}</td>
                      <td>{visibilityBadge(post.visibility)}</td>
                      <td>{post.likeCount ?? 0}</td>
                      <td>{post.commentCount ?? 0}</td>
                      <td>{formatDate(post.updatedAt || post.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={list.loading || list.page <= 0}
              onClick={() => fetchPosts(list.page - 1)}
            >
              Trước
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={list.loading || list.page + 1 >= (list.totalPages || 1)}
              onClick={() => fetchPosts(list.page + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <div className="col-lg-5">
        <div className="admin-card">
          <h6>Chi tiết bài viết</h6>
          {!selected && <div className="text-secondary">Chọn bài viết để xem chi tiết.</div>}
          {selected && (
            <>
              <div className="mb-2">
                <div className="fw-semibold">{truncate(selected.content, 120) || '(Không có nội dung)'}</div>
                <div className="small text-secondary">#{selected.id} · Tác giả #{selected.authorId}</div>
              </div>
              {detail.error && <div className="alert alert-danger py-2">{detail.error}</div>}
              {detail.message && <div className="alert alert-success py-2">{detail.message}</div>}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label">Hiển thị</label>
                  <select
                    className="form-select"
                    value={detail.visibility}
                    onChange={(e) => setDetail((prev) => ({ ...prev, visibility: e.target.value }))}
                    disabled={detail.loading}
                  >
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="PRIVATE">PRIVATE</option>
                  </select>
                  <button
                    className="btn btn-primary w-100 mt-2"
                    onClick={updateVisibility}
                    disabled={detail.saving || detail.loading}
                  >
                    {detail.saving ? 'Đang lưu...' : 'Cập nhật hiển thị'}
                  </button>
                </div>
                <div className="col-6 d-flex align-items-end">
                  <button
                    className="btn btn-outline-danger w-100"
                    onClick={deletePost}
                    disabled={detail.deleting}
                  >
                    {detail.deleting ? 'Đang xóa...' : 'Xóa bài'}
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-secondary small">Nội dung đầy đủ</div>
                <div className="p-2 border rounded bg-light">{selected.content || '--'}</div>
              </div>

              <div>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-semibold">Bình luận</span>
                  <span className="text-secondary small">{comments.items.length}</span>
                </div>
                {comments.error && <div className="alert alert-danger py-2">{comments.error}</div>}
                {comments.loading ? (
                  <div className="text-secondary">Đang tải...</div>
                ) : comments.items.length === 0 ? (
                  <div className="text-secondary">Không có bình luận.</div>
                ) : (
                  <div className="scroll-area border rounded p-2">
                    {comments.items.map((c) => (
                      <div key={c.id} className="border-bottom pb-2 mb-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="fw-semibold">#{c.id}</div>
                          <button className="btn btn-link btn-sm text-danger" onClick={() => deleteComment(c.id)}>
                            Xóa
                          </button>
                        </div>
                        <div className="text-secondary small">{formatDate(c.createdAt)}</div>
                        <div>{c.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostsPage;
