import { useEffect, useMemo, useState } from 'react';
import adminLawService from '../../../services/adminLawService';
import Pager from './Pager';
import LawUploadForm from './LawUploadForm';
import { pickError, formatDate } from '../shared';

const PAGE_SIZE = 10;

const LawsPanel = () => {
  const [secretKey, setSecretKey] = useState(() => sessionStorage.getItem('adminLawKey') || '');
  const [keyDraft, setKeyDraft] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(Boolean(secretKey));

  const [lawFilters, setLawFilters] = useState({ keyword: '' });
  const [lawListState, setLawListState] = useState({
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

  const [uploadState, setUploadState] = useState({
    file: null,
    code: '',
    title: '',
    effectiveDate: '',
    docType: '',
    replaceExisting: false,
    loading: false,
    error: '',
    message: '',
  });

  const currentKey = useMemo(() => secretKey.trim(), [secretKey]);

  const handleSaveKey = () => {
    const next = keyDraft.trim();
    if (!next) {
      sessionStorage.removeItem('adminLawKey');
      setSecretKey('');
      setApiKeySaved(false);
      return;
    }
    sessionStorage.setItem('adminLawKey', next);
    setSecretKey(next);
    setKeyDraft('');
    setApiKeySaved(true);
  };

  const handleClearKey = () => {
    sessionStorage.removeItem('adminLawKey');
    setSecretKey('');
    setKeyDraft('');
    setApiKeySaved(false);
    setLawListState((prev) => ({
      ...prev,
      items: [],
      total: 0,
      totalPages: 0,
      page: 0,
      hasNext: false,
      hasPrevious: false,
    }));
  };

  const fetchLaws = async (page = 0) => {
    setLawListState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await adminLawService.listLaws({ ...lawFilters, page, size: PAGE_SIZE }, currentKey);
      const data = res?.data || {};
      setLawListState((prev) => ({
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
      setLawListState((prev) => ({
        ...prev,
        loading: false,
        error: pickError(err, 'Không tải được văn bản'),
      }));
    }
  };

  useEffect(() => {
    if (currentKey) {
      fetchLaws(0);
    } else {
      setLawListState((prev) => ({
        ...prev,
        items: [],
        total: 0,
        totalPages: 0,
        page: 0,
        hasNext: false,
        hasPrevious: false,
      }));
    }
  }, [lawFilters, currentKey]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadState.file) {
      setUploadState((prev) => ({ ...prev, error: 'Chọn file PDF trước' }));
      return;
    }
    setUploadState((prev) => ({ ...prev, loading: true, error: '', message: '' }));
    try {
      const meta = {
        code: uploadState.code || undefined,
        title: uploadState.title || undefined,
        effectiveDate: uploadState.effectiveDate || undefined,
        docType: uploadState.docType || undefined,
        replaceExisting: uploadState.replaceExisting,
      };
      const res = await adminLawService.uploadLaw({ file: uploadState.file, meta }, currentKey);
      setUploadState((prev) => ({
        ...prev,
        loading: false,
        message: res?.message || 'Đã tải lên',
        error: '',
      }));
    } catch (err) {
      setUploadState((prev) => ({
        ...prev,
        loading: false,
        error: pickError(err, 'Không tải được PDF'),
      }));
    }
  };

  return (
    <div className="admin__panel">
      <div className="admin__card admin__card--detail">
        <div className="admin__card-header">
          <div>
            <div className="admin__eyebrow">Kho văn bản</div>
            <div className="admin__card-title">Khóa truy cập (ẩn)</div>
          </div>
          {apiKeySaved ? <span className="pill pill--outline">Đã lưu trong phiên</span> : <span className="pill pill--muted">Chưa có khóa</span>}
        </div>
        <div className="admin__form admin__form--split">
          <input
            type="password"
            placeholder="Dán khóa truy cập và nhấn lưu (không hiện lại)"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
          />
          <button type="button" className="admin__btn" onClick={handleSaveKey}>
            Lưu khóa
          </button>
          <button type="button" className="admin__btn admin__btn--ghost" onClick={handleClearKey} disabled={!currentKey}>
            Xóa khỏi phiên
          </button>
        </div>
        <p className="admin__muted">
          Khóa được lưu trong sessionStorage và không hiển thị ra màn hình để tránh rò rỉ X-API-KEY.
        </p>
      </div>

      <form className="admin__filters" onSubmit={(e) => { e.preventDefault(); fetchLaws(0); }}>
        <label className="admin__filter">
          <span>Từ khóa</span>
          <input
            type="text"
            placeholder="Mã văn bản hoặc tiêu đề"
            value={lawFilters.keyword}
            onChange={(e) => setLawFilters((prev) => ({ ...prev, keyword: e.target.value }))}
          />
        </label>
        <div className="admin__filter admin__filter--actions">
          <button type="submit" className="admin__btn" disabled={!currentKey}>
            Tìm
          </button>
          <button
            type="button"
            className="admin__btn admin__btn--ghost"
            onClick={() => {
              setLawFilters({ keyword: '' });
              setLawListState((prev) => ({ ...prev, items: [] }));
            }}
          >
            Xóa
          </button>
        </div>
      </form>

      <div className="admin__stack">
        <div className="admin__card">
          <div className="admin__card-header">
            <div>
              <div className="admin__eyebrow">Văn bản</div>
              <div className="admin__card-title">Kết quả tìm kiếm</div>
            </div>
            <div className="admin__card-actions">
              <button
                type="button"
                className="admin__btn admin__btn--ghost"
                onClick={() => fetchLaws(lawListState.page)}
                disabled={lawListState.loading || !currentKey}
              >
                Tải lại
              </button>
              <Pager
                state={lawListState}
                onPrev={() => fetchLaws(Math.max(0, lawListState.page - 1))}
                onNext={() => fetchLaws(lawListState.page + 1)}
              />
            </div>
          </div>
          {lawListState.error && <div className="admin__alert admin__alert--error">{lawListState.error}</div>}
          <div className="admin__table-wrapper">
            <table className="admin__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Mã</th>
                  <th>Loại</th>
                  <th>Tiêu đề</th>
                  <th>Hiệu lực</th>
                </tr>
              </thead>
              <tbody>
                {lawListState.loading ? (
                  <tr>
                    <td colSpan="5" className="admin__muted">
                      Đang tải văn bản...
                    </td>
                  </tr>
                ) : lawListState.items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="admin__muted">
                      Không có văn bản.
                    </td>
                  </tr>
                ) : (
                  lawListState.items.map((law) => (
                    <tr key={law.id}>
                      <td>#{law.id}</td>
                      <td className="admin__ellipsis">{law.code || '--'}</td>
                      <td>{law.docType || '--'}</td>
                      <td className="admin__ellipsis">{law.title || '--'}</td>
                      <td>{formatDate(law.effectiveDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin__card">
          <div className="admin__card-header">
            <div>
              <div className="admin__eyebrow">Tải PDF</div>
              <div className="admin__card-title">/api/admin/laws/upload</div>
            </div>
            {uploadState.message && <span className="pill pill--outline">Hoàn tất</span>}
          </div>
          <LawUploadForm uploadState={uploadState} setUploadState={setUploadState} onUpload={handleUpload} disabled={!currentKey} />
        </div>
      </div>
    </div>
  );
};

export default LawsPanel;
