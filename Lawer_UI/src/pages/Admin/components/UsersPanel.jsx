import { useEffect, useState } from 'react';
import adminService from '../../../services/adminService';
import Pager from './Pager';
import { formatDate, parseRoles, pickError } from '../shared';

const STATUS_OPTIONS = ['ACTIVE', 'PENDING', 'DISABLED'];
const PAGE_SIZE = 10;

const UsersPanel = () => {
  const [search, setSearch] = useState({ keyword: '', status: '' });
  const [filters, setFilters] = useState({ keyword: '', status: '' });
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailState, setDetailState] = useState({
    loading: false,
    saving: false,
    error: '',
    message: '',
    statusInput: STATUS_OPTIONS[0],
    rolesInput: '',
  });

  const fetchUsers = async (page = 0) => {
    setListState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await adminService.listUsers({ ...filters, page, size: PAGE_SIZE });
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
        error: pickError(err, 'Không tải được người dùng'),
      }));
    }
  };

  useEffect(() => {
    fetchUsers(0);
  }, [filters]);

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setFilters(search);
    setSelectedUser(null);
  };

  const handleResetFilters = () => {
    const cleared = { keyword: '', status: '' };
    setSearch(cleared);
    setFilters(cleared);
    setSelectedUser(null);
  };

  const handleSelectUser = async (user) => {
    if (!user?.id) return;
    setSelectedUser(user);
    setDetailState((prev) => ({
      ...prev,
      loading: true,
      message: '',
      error: '',
      statusInput: user.status || prev.statusInput,
      rolesInput: user.roles || prev.rolesInput,
    }));
    try {
      const res = await adminService.getUser(user.id);
      const data = res?.data || user;
      setSelectedUser(data);
      setDetailState((prev) => ({
        ...prev,
        loading: false,
        statusInput: data.status || prev.statusInput,
        rolesInput: data.roles || prev.rolesInput,
      }));
    } catch (err) {
      setDetailState((prev) => ({
        ...prev,
        loading: false,
        error: pickError(err, 'Không tải được thông tin người dùng'),
      }));
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedUser) return;
    setDetailState((prev) => ({ ...prev, saving: true, message: '', error: '' }));
    try {
      const res = await adminService.updateUserStatus(selectedUser.id, detailState.statusInput);
      const updated = res?.data || selectedUser;
      setSelectedUser(updated);
      setListState((prev) => ({
        ...prev,
        items: prev.items.map((u) =>
          u.id === updated.id ? { ...u, status: updated.status, roles: updated.roles } : u,
        ),
      }));
      setDetailState((prev) => ({ ...prev, saving: false, message: 'Đã cập nhật trạng thái' }));
    } catch (err) {
      setDetailState((prev) => ({
        ...prev,
        saving: false,
        error: pickError(err, 'Không cập nhật được trạng thái'),
      }));
    }
  };

  const handleUpdateRoles = async () => {
    if (!selectedUser) return;
    setDetailState((prev) => ({ ...prev, saving: true, message: '', error: '' }));
    try {
      const res = await adminService.updateUserRoles(selectedUser.id, detailState.rolesInput);
      const updated = res?.data || selectedUser;
      setSelectedUser(updated);
      setListState((prev) => ({
        ...prev,
        items: prev.items.map((u) =>
          u.id === updated.id ? { ...u, status: updated.status, roles: updated.roles } : u,
        ),
      }));
      setDetailState((prev) => ({ ...prev, saving: false, message: 'Đã cập nhật vai trò' }));
    } catch (err) {
      setDetailState((prev) => ({
        ...prev,
        saving: false,
        error: pickError(err, 'Không cập nhật được vai trò'),
      }));
    }
  };

  return (
    <div className="admin__panel">
      <form className="admin__filters" onSubmit={handleApplyFilters}>
        <label className="admin__filter">
          <span>Từ khóa</span>
          <input
            type="text"
            placeholder="Email hoặc tên hiển thị"
            value={search.keyword}
            onChange={(e) => setSearch((prev) => ({ ...prev, keyword: e.target.value }))}
          />
        </label>
        <label className="admin__filter">
          <span>Trạng thái</span>
          <select
            value={search.status}
            onChange={(e) => setSearch((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Tất cả</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>
        <div className="admin__filter admin__filter--actions">
          <button type="submit" className="admin__btn">
            Lọc
          </button>
          <button type="button" className="admin__btn admin__btn--ghost" onClick={handleResetFilters}>
            Xóa lọc
          </button>
        </div>
      </form>

      <div className="admin__grid">
        <div className="admin__card">
          <div className="admin__card-header">
            <div>
              <div className="admin__eyebrow">Người dùng</div>
              <div className="admin__card-title">Danh sách người dùng</div>
            </div>
            <div className="admin__card-actions">
              <button
                type="button"
                className="admin__btn admin__btn--ghost"
                onClick={() => fetchUsers(listState.page)}
                disabled={listState.loading}
              >
                Tải lại
              </button>
              <Pager state={listState} onPrev={() => fetchUsers(listState.page - 1)} onNext={() => fetchUsers(listState.page + 1)} />
            </div>
          </div>

          {listState.error && <div className="admin__alert admin__alert--error">{listState.error}</div>}
          <div className="admin__table-wrapper">
            <table className="admin__table">
              <thead>
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
                {listState.loading ? (
                  <tr>
                    <td colSpan="6" className="admin__muted">
                      Đang tải người dùng...
                    </td>
                  </tr>
                ) : listState.items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="admin__muted">
                      Không có người dùng.
                    </td>
                  </tr>
                ) : (
                  listState.items.map((user) => {
                    const roles = parseRoles(user.roles);
                    return (
                      <tr
                        key={user.id}
                        className={selectedUser?.id === user.id ? 'is-selected' : ''}
                        onClick={() => handleSelectUser(user)}
                      >
                        <td>#{user.id}</td>
                        <td className="admin__ellipsis">{user.email || '--'}</td>
                        <td className="admin__ellipsis">{user.displayName || '--'}</td>
                        <td>
                          <span className={`pill pill--${(user.status || '').toLowerCase() || 'muted'}`}>
                            {user.status || 'N/A'}
                          </span>
                        </td>
                        <td>
                          {roles.length ? roles.map((r) => <span key={r} className="pill pill--soft">{r}</span>) : '--'}
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin__card admin__card--detail">
          <div className="admin__card-header">
            <div>
              <div className="admin__eyebrow">Chi tiết người dùng</div>
              <div className="admin__card-title">
                {selectedUser ? selectedUser.displayName || selectedUser.email : 'Chọn người dùng'}
              </div>
            </div>
            {selectedUser && <span className="pill pill--outline">#{selectedUser.id}</span>}
          </div>

          {!selectedUser ? (
            <p className="admin__muted">Chọn người dùng để xem chi tiết và quản trị.</p>
          ) : (
            <>
              <div className="admin__meta">
                <div>
                  <div className="admin__label">Email</div>
                  <div className="admin__value">{selectedUser.email}</div>
                </div>
                <div>
                  <div className="admin__label">Trạng thái</div>
                  <div className="admin__value">
                    <span className={`pill pill--${(selectedUser.status || '').toLowerCase() || 'muted'}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="admin__label">Vai trò</div>
                  <div className="admin__value admin__chips">
                    {parseRoles(selectedUser.roles).map((r) => (
                      <span key={r} className="pill pill--soft">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="admin__label">Tạo lúc</div>
                  <div className="admin__value">{formatDate(selectedUser.createdAt)}</div>
                </div>
                <div>
                  <div className="admin__label">Cập nhật</div>
                  <div className="admin__value">{formatDate(selectedUser.updatedAt)}</div>
                </div>
              </div>

              {detailState.error && <div className="admin__alert admin__alert--error">{detailState.error}</div>}
              {detailState.message && (
                <div className="admin__alert admin__alert--success">{detailState.message}</div>
              )}

              <div className="admin__form">
                <label>
                  <span>Trạng thái</span>
                  <select
                    value={detailState.statusInput}
                    onChange={(e) => setDetailState((prev) => ({ ...prev, statusInput: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="admin__btn"
                  onClick={handleUpdateStatus}
                  disabled={detailState.saving || detailState.loading}
                >
                  {detailState.saving ? 'Đang lưu...' : 'Cập nhật trạng thái'}
                </button>
              </div>

              <div className="admin__form">
                <label>
                  <span>Vai trò</span>
                  <input
                    type="text"
                    placeholder="ADMIN,USER"
                    value={detailState.rolesInput}
                    onChange={(e) => setDetailState((prev) => ({ ...prev, rolesInput: e.target.value }))}
                  />
                </label>
                <button
                  type="button"
                  className="admin__btn"
                  onClick={handleUpdateRoles}
                  disabled={detailState.saving || detailState.loading}
                >
                  {detailState.saving ? 'Đang lưu...' : 'Cập nhật vai trò'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersPanel;
