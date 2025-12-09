import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../../contexts/UserContext';
import adminService from '../../services/adminService';
import { formatDate, parseRoles, pickError } from './shared';

const STATUS_LABELS = {
  ACTIVE: { text: 'ACTIVE', className: 'bg-success-subtle text-success-emphasis' },
  PENDING: { text: 'PENDING', className: 'bg-warning-subtle text-warning-emphasis' },
  DISABLED: { text: 'DISABLED', className: 'bg-danger-subtle text-danger-emphasis' },
};

const PAGE_SIZE = 10;

const UsersPage = () => {
  const { user: me } = useContext(UserContext);
  const [filters, setFilters] = useState({ keyword: '', status: '' });
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
    error: '',
    message: '',
    status: 'ACTIVE',
    roles: '',
  });

  const fetchUsers = async (page = 0) => {
    setList((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await adminService.listUsers({ ...filters, page, size: PAGE_SIZE });
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
      setList((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không tải được người dùng') }));
    }
  };

  const handleSelect = async (row) => {
    setSelected(row);
    setDetail((prev) => ({ ...prev, loading: true, error: '', message: '' }));
    try {
      const res = await adminService.getUser(row.id);
      const data = res?.data || row;
      setSelected(data);
      setDetail((prev) => ({
        ...prev,
        loading: false,
        status: data.status || 'ACTIVE',
        roles: data.roles || '',
      }));
    } catch (err) {
      setDetail((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không tải được chi tiết') }));
    }
  };

  const updateStatus = async () => {
    if (!selected) return;
    setDetail((prev) => ({ ...prev, saving: true, message: '', error: '' }));
    try {
      const res = await adminService.updateUserStatus(selected.id, detail.status);
      const data = res?.data || selected;
      setSelected(data);
      setList((prev) => ({
        ...prev,
        items: prev.items.map((u) => (u.id === data.id ? { ...u, status: data.status } : u)),
      }));
      setDetail((prev) => ({ ...prev, saving: false, message: 'Đã cập nhật trạng thái' }));
    } catch (err) {
      setDetail((prev) => ({ ...prev, saving: false, error: pickError(err, 'Không cập nhật được trạng thái') }));
    }
  };

  const updateRoles = async () => {
    if (!selected) return;
    if (selected.id === me?.id) {
      setDetail((prev) => ({ ...prev, error: 'Không tự đổi vai trò của bạn' }));
      return;
    }
    setDetail((prev) => ({ ...prev, saving: true, message: '', error: '' }));
    try {
      const res = await adminService.updateUserRoles(selected.id, detail.roles);
      const data = res?.data || selected;
      setSelected(data);
      setList((prev) => ({
        ...prev,
        items: prev.items.map((u) => (u.id === data.id ? { ...u, roles: data.roles } : u)),
      }));
      setDetail((prev) => ({ ...prev, saving: false, message: 'Đã cập nhật vai trò' }));
    } catch (err) {
      setDetail((prev) => ({ ...prev, saving: false, error: pickError(err, 'Không cập nhật được vai trò') }));
    }
  };

  useEffect(() => {
    fetchUsers(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const statusBadge = (status) => {
    const cfg = STATUS_LABELS[status] || { text: status || 'N/A', className: 'bg-secondary-subtle' };
    return <span className={`badge badge-pill ${cfg.className}`}>{cfg.text}</span>;
  };

  return (
    <div className="row g-3">
      <div className="col-12">
        <div className="admin-card">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="mb-0">Quản lý người dùng</h6>
            <small className="text-secondary">social-service</small>
          </div>
          <form
            className="row g-2"
            onSubmit={(e) => {
              e.preventDefault();
              fetchUsers(0);
            }}
          >
            <div className="col-md-4">
              <label className="form-label">Tìm kiếm</label>
              <input
                className="form-control"
                placeholder="Email hoặc tên"
                value={filters.keyword}
                onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Trạng thái</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Tất cả</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PENDING">PENDING</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button type="submit" className="btn btn-primary w-100">
                Lọc
              </button>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={() => setFilters({ keyword: '', status: '' })}
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
            <h6 className="mb-0">Danh sách</h6>
            <div className="small text-secondary">
              Trang {list.page + 1}/{Math.max(1, list.totalPages || 1)}
            </div>
          </div>
          {list.error && <div className="alert alert-danger py-2">{list.error}</div>}
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Tên</th>
                  <th>Trạng thái</th>
                  <th>Vai trò</th>
                  <th>Tạo lúc</th>
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
                      Không có người dùng
                    </td>
                  </tr>
                ) : (
                  list.items.map((u) => (
                    <tr
                      key={u.id}
                      className={selected?.id === u.id ? 'table-active' : ''}
                      onClick={() => handleSelect(u)}
                      role="button"
                    >
                      <td>#{u.id}</td>
                      <td>{u.email}</td>
                      <td>{u.displayName || '--'}</td>
                      <td>{statusBadge(u.status)}</td>
                      <td>
                        {parseRoles(u.roles).map((r) => (
                          <span key={r} className="badge bg-light text-dark me-1">
                            {r}
                          </span>
                        ))}
                      </td>
                      <td>{formatDate(u.createdAt)}</td>
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
              onClick={() => fetchUsers(list.page - 1)}
            >
              Trước
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={list.loading || list.page + 1 >= (list.totalPages || 1)}
              onClick={() => fetchUsers(list.page + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      <div className="col-lg-5">
        <div className="admin-card">
          <h6>Chi tiết</h6>
          {!selected && <div className="text-secondary">Chọn người dùng để xem chi tiết.</div>}
          {selected && (
            <>
              <div className="mb-2">
                <div className="fw-semibold">{selected.displayName || selected.email}</div>
                <div className="text-secondary small">#{selected.id}</div>
              </div>
              <div className="mb-2 d-flex gap-2 flex-wrap">
                {statusBadge(selected.status)}
                {parseRoles(selected.roles).map((r) => (
                  <span key={r} className="badge bg-light text-dark">
                    {r}
                  </span>
                ))}
              </div>
              <div className="row g-2 mb-2">
                <div className="col-6">
                  <div className="text-secondary small">Tạo</div>
                  <div>{formatDate(selected.createdAt)}</div>
                </div>
                <div className="col-6">
                  <div className="text-secondary small">Cập nhật</div>
                  <div>{formatDate(selected.updatedAt)}</div>
                </div>
              </div>
              {detail.error && <div className="alert alert-danger py-2">{detail.error}</div>}
              {detail.message && <div className="alert alert-success py-2">{detail.message}</div>}

              <div className="mb-3">
                <label className="form-label">Trạng thái</label>
                <select
                  className="form-select"
                  value={detail.status}
                  onChange={(e) => setDetail((prev) => ({ ...prev, status: e.target.value }))}
                  disabled={detail.loading}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING">PENDING</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
                <button
                  className="btn btn-primary w-100 mt-2"
                  onClick={updateStatus}
                  disabled={detail.saving || detail.loading}
                >
                  {detail.saving ? 'Đang lưu...' : 'Cập nhật trạng thái'}
                </button>
              </div>

              <div className="mb-2">
                <label className="form-label">Vai trò (phân tách dấu phẩy)</label>
                <input
                  className="form-control"
                  value={detail.roles}
                  onChange={(e) => setDetail((prev) => ({ ...prev, roles: e.target.value }))}
                  disabled={detail.loading || selected.id === me?.id}
                />
                <button
                  className="btn btn-outline-primary w-100 mt-2"
                  onClick={updateRoles}
                  disabled={detail.saving || detail.loading || selected.id === me?.id}
                >
                  {detail.saving ? 'Đang lưu...' : 'Cập nhật vai trò'}
                </button>
                {selected.id === me?.id && (
                  <div className="text-secondary small mt-1">Không tự đổi vai trò của bạn.</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
