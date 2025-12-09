import { useEffect, useMemo, useState } from 'react';
import adminLawService from '../../services/adminLawService';
import { formatDate, pickError, truncate } from './shared';

const LAW_PAGE_SIZE = 10;
const NODE_PAGE_SIZE = 25;

const prettifySegment = (s) => {
  if (!s) return '';
  const clean = s.replace(/[_-]+/g, ' ').toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

const formatPath = (path) => {
  if (!path) return '';
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) return '';
  const keep = parts.slice(Math.max(0, parts.length - 2));
  return keep.map(prettifySegment).join(' > ');
};

const LawsPage = () => {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('adminLawKey') || '');
  const [lawList, setLawList] = useState({
    items: [],
    loading: false,
    error: '',
    page: 0,
    totalPages: 0,
    keyword: '',
  });
  const [selectedLaw, setSelectedLaw] = useState(null);
  const [lawDetail, setLawDetail] = useState({
    loading: false,
    error: '',
    toc: [],
    related: [],
    meta: null,
  });
  const [nodesState, setNodesState] = useState({
    items: [],
    loading: false,
    error: '',
    page: 0,
    hasNext: false,
    hasPrevious: false,
    effectiveAt: '',
    trail: [],
  });
  const [searchState, setSearchState] = useState({
    keyword: '',
    effectiveAt: '',
    loading: false,
    error: '',
    results: [],
  });
  const [fulltextState, setFulltextState] = useState({
    q: '',
    loading: false,
    error: '',
    results: [],
  });
  const [qaState, setQaState] = useState({
    question: '',
    effectiveAt: '',
    loading: false,
    error: '',
    answer: null,
  });
  const [uploadState, setUploadState] = useState({
    file: null,
    code: '',
    title: '',
    docType: '',
    issuingBody: '',
    promulgationDate: '',
    effectiveDate: '',
    expireDate: '',
    relatedLawId: '',
    replaceExisting: false,
    triggerReindex: false,
    nodeEffectiveStart: '',
    nodeEffectiveEnd: '',
    loading: false,
    error: '',
    message: '',
  });

  const hasKey = useMemo(() => apiKey.trim().length > 0, [apiKey]);

  const saveKey = (value) => {
    const next = (value || '').trim();
    setApiKey(next);
    if (next) {
      sessionStorage.setItem('adminLawKey', next);
    } else {
      sessionStorage.removeItem('adminLawKey');
    }
  };

  const fetchLaws = async (page = 0) => {
    if (!hasKey) {
      setLawList((prev) => ({ ...prev, items: [], error: 'Nhập X-API-KEY', page: 0, totalPages: 0 }));
      return;
    }
    setLawList((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await adminLawService.listLaws({ keyword: lawList.keyword, page, size: LAW_PAGE_SIZE }, apiKey);
      const data = res?.data || res || {};
      setLawList((prev) => ({
        ...prev,
        loading: false,
        items: data.content || [],
        page: data.page ?? page,
        totalPages: data.totalPages ?? 0,
        error: '',
      }));
      if (!selectedLaw && (data.content || []).length > 0) {
        selectLaw(data.content[0]);
      }
    } catch (err) {
      setLawList((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không tải được luật') }));
    }
  };

  const fetchNodes = async (law, page = 0, trailOverride) => {
    if (!law || !hasKey) return;
    setNodesState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const trail = trailOverride ?? nodesState.trail;
      const parent = trail.length ? trail[trail.length - 1] : null;
      const res = await adminLawService.listNodesByParent(
        law.id,
        { parentId: parent?.id, effectiveAt: nodesState.effectiveAt, page, size: NODE_PAGE_SIZE },
        apiKey,
      );
      const data = res?.data || res || {};
      setNodesState((prev) => ({
        ...prev,
        loading: false,
        items: data.content || [],
        page: data.page ?? page,
        hasNext: Boolean(data.hasNext),
        hasPrevious: Boolean(data.hasPrevious),
      }));
    } catch (err) {
      setNodesState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không tải được điều luật') }));
    }
  };

  const selectLaw = async (law) => {
    setSelectedLaw(law);
    setLawDetail({ loading: true, error: '', toc: [], related: [], meta: law });
    setNodesState((prev) => ({ ...prev, trail: [], page: 0 }));
    if (!hasKey) return;
    try {
      const [detailRes, tocRes, relatedRes] = await Promise.all([
        adminLawService.getLaw(law.id, apiKey),
        adminLawService.getToc(law.id, apiKey),
        adminLawService.getRelated(law.id, undefined, apiKey),
      ]);
      setLawDetail({
        loading: false,
        error: '',
        meta: detailRes?.data || detailRes || law,
        toc: tocRes?.data || tocRes || [],
        related: relatedRes?.data || relatedRes || [],
      });
      fetchNodes(law, 0);
    } catch (err) {
      setLawDetail((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không tải được chi tiết') }));
    }
  };

  const goDeeper = (node) => {
    const nextTrail = [...nodesState.trail, node];
    setNodesState((prev) => ({ ...prev, trail: nextTrail, page: 0 }));
    fetchNodes(selectedLaw, 0, nextTrail);
  };

  const goUpTo = (idx) => {
    const nextTrail = nodesState.trail.slice(0, idx);
    setNodesState((prev) => ({ ...prev, trail: nextTrail, page: 0 }));
    fetchNodes(selectedLaw, 0, nextTrail);
  };

  const searchNodes = async () => {
    if (!selectedLaw || !hasKey) return;
    setSearchState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await adminLawService.searchNodes(
        { keyword: searchState.keyword, effectiveAt: searchState.effectiveAt, page: 0, size: 25 },
        apiKey,
      );
      const data = res?.data || res || {};
      setSearchState((prev) => ({ ...prev, loading: false, results: data.content || [] }));
    } catch (err) {
      setSearchState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không tìm được điều luật') }));
    }
  };

  const searchFulltext = async () => {
    if (!hasKey) return;
    setFulltextState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await adminLawService.searchNodesFulltext(
        { q: fulltextState.q, page: 0, size: 10 },
        apiKey,
      );
      const data = res?.data || res || {};
      setFulltextState((prev) => ({ ...prev, loading: false, results: data.content || [] }));
    } catch (err) {
      setFulltextState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không tìm fulltext được') }));
    }
  };

  const analyzeQa = async () => {
    if (!hasKey) return;
    setQaState((prev) => ({ ...prev, loading: true, error: '', answer: null }));
    try {
      const res = await adminLawService.qaAnalyze(
        { question: qaState.question },
        { effectiveAt: qaState.effectiveAt },
        apiKey,
      );
      const data = res?.data || res || {};
      setQaState((prev) => ({ ...prev, loading: false, answer: data, error: '' }));
    } catch (err) {
      setQaState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không analyze được') }));
    }
  };

  const uploadLaw = async (e) => {
    e.preventDefault();
    if (!uploadState.file) {
      setUploadState((prev) => ({ ...prev, error: 'Chọn PDF', message: '' }));
      return;
    }
    setUploadState((prev) => ({ ...prev, loading: true, error: '', message: '' }));
    try {
      const res = await adminLawService.uploadLaw(
        {
          file: uploadState.file,
          meta: {
            code: uploadState.code || undefined,
            title: uploadState.title || undefined,
            docType: uploadState.docType || undefined,
            issuingBody: uploadState.issuingBody || undefined,
            promulgationDate: uploadState.promulgationDate || undefined,
            effectiveDate: uploadState.effectiveDate || undefined,
            expireDate: uploadState.expireDate || undefined,
            relatedLawId: uploadState.relatedLawId || undefined,
            replaceExisting: uploadState.replaceExisting,
            triggerReindex: uploadState.triggerReindex,
            nodeEffectiveStart: uploadState.nodeEffectiveStart || undefined,
            nodeEffectiveEnd: uploadState.nodeEffectiveEnd || undefined,
          },
        },
        apiKey,
      );
      setUploadState((prev) => ({
        ...prev,
        loading: false,
        message: res?.message || 'Đã tải văn bản',
      }));
      fetchLaws(0);
    } catch (err) {
      setUploadState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không tải PDF được') }));
    }
  };

  useEffect(() => {
    fetchLaws(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (selectedLaw && hasKey) {
      fetchNodes(selectedLaw, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesState.effectiveAt]);

  return (
    <div className="row g-3">
      <div className="col-12">
        <div className="admin-card">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="mb-0">Kho luật & corpus</h6>
            <span className="badge bg-dark">X-API-KEY</span>
          </div>
          <div className="row g-2">
            <div className="col-md-6 d-flex gap-2">
              <input
                className="form-control"
                type="password"
                placeholder="Dán X-API-KEY"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button className="btn btn-primary" type="button" onClick={() => saveKey(apiKey)}>
                Lưu
              </button>
              <button className="btn btn-outline-secondary" type="button" onClick={() => saveKey('')}>
                Xóa
              </button>
            </div>
            <div className="col-md-6">
              <form
                className="d-flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchLaws(0);
                }}
              >
                <input
                  className="form-control"
                  placeholder="Từ khóa"
                  value={lawList.keyword}
                  onChange={(e) => setLawList((prev) => ({ ...prev, keyword: e.target.value }))}
                />
                <button className="btn btn-outline-primary" type="submit" disabled={!hasKey}>
                  Tìm
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-7">
        <div className="admin-card mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Danh sách luật</h6>
            <small className="text-secondary">
              Trang {lawList.page + 1}/{Math.max(1, lawList.totalPages || 1)}
            </small>
          </div>
          {lawList.error && <div className="alert alert-danger py-2">{lawList.error}</div>}
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Mã</th>
                  <th>Loại</th>
                  <th>Tiêu đề</th>
                  <th>Hiệu lực</th>
                </tr>
              </thead>
              <tbody>
                {lawList.loading ? (
                  <tr>
                    <td colSpan="5" className="text-center text-secondary">
                      Đang tải...
                    </td>
                  </tr>
                ) : lawList.items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center text-secondary">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  lawList.items.map((law) => (
                    <tr
                      key={law.id}
                      className={selectedLaw?.id === law.id ? 'table-active' : ''}
                      role="button"
                      onClick={() => selectLaw(law)}
                    >
                      <td>#{law.id}</td>
                      <td>{law.code}</td>
                      <td>{law.docType}</td>
                      <td>{truncate(law.title, 60)}</td>
                      <td>{law.effectiveDate || '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={lawList.loading || lawList.page <= 0}
              onClick={() => fetchLaws(lawList.page - 1)}
            >
              Trước
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={lawList.loading || lawList.page + 1 >= (lawList.totalPages || 1)}
              onClick={() => fetchLaws(lawList.page + 1)}
            >
              Sau
            </button>
          </div>
        </div>

        <div className="admin-card">
          <div className="d-flex justify-content-between mb-2">
            <h6 className="mb-0">Tìm node (LIKE)</h6>
            <small className="text-secondary">/api/admin/laws/nodes/search</small>
          </div>
          <div className="row g-2">
            <div className="col-md-6">
              <input
                className="form-control"
                placeholder="Từ khóa"
                value={searchState.keyword}
                onChange={(e) => setSearchState((prev) => ({ ...prev, keyword: e.target.value }))}
              />
            </div>
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="effectiveAt (YYYY-MM-DD)"
                value={searchState.effectiveAt}
                onChange={(e) => setSearchState((prev) => ({ ...prev, effectiveAt: e.target.value }))}
              />
            </div>
            <div className="col-md-2 d-grid">
              <button className="btn btn-outline-primary" onClick={searchNodes} disabled={searchState.loading || !hasKey}>
                Tìm
              </button>
            </div>
          </div>
          {searchState.error && <div className="alert alert-danger py-2 mt-2">{searchState.error}</div>}
          <div className="scroll-area mt-2">
            {searchState.loading && <div className="text-secondary">Đang tìm...</div>}
            {!searchState.loading && searchState.results.length === 0 && (
              <div className="text-secondary">Không có kết quả</div>
            )}
            {searchState.results.map((node) => (
              <div key={node.id} className="border-bottom pb-2 mb-2">
                <div className="fw-semibold">{node.code || node.id}</div>
                <div className="text-secondary small">{formatPath(node.path || node.reference)}</div>
                <div>{truncate(node.content || node.text || '', 200)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card mt-3">
          <div className="d-flex justify-content-between mb-2">
            <h6 className="mb-0">Tìm node (fulltext)</h6>
            <small className="text-secondary">/api/admin/laws/nodes/search/fulltext</small>
          </div>
          <div className="row g-2">
            <div className="col-md-9">
              <input
                className="form-control"
                placeholder="Câu hỏi / từ khóa"
                value={fulltextState.q}
                onChange={(e) => setFulltextState((prev) => ({ ...prev, q: e.target.value }))}
              />
            </div>
            <div className="col-md-3 d-grid">
              <button className="btn btn-outline-primary" onClick={searchFulltext} disabled={fulltextState.loading || !hasKey}>
                Tìm fulltext
              </button>
            </div>
          </div>
          {fulltextState.error && <div className="alert alert-danger py-2 mt-2">{fulltextState.error}</div>}
          <div className="scroll-area mt-2">
            {fulltextState.loading && <div className="text-secondary">Đang tìm...</div>}
            {!fulltextState.loading && fulltextState.results.length === 0 && (
              <div className="text-secondary">Không có kết quả</div>
            )}
            {fulltextState.results.map((node) => (
              <div key={node.id} className="border-bottom pb-2 mb-2">
                <div className="fw-semibold">{node.title || node.code || node.id}</div>
                {node.highlight && (
                  <div className="small text-secondary" dangerouslySetInnerHTML={{ __html: node.highlight }} />
                )}
                {!node.highlight && <div className="small text-secondary">{truncate(node.content || '', 220)}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="col-12 col-xl-5">
        <div className="admin-card mb-3">
          <div className="d-flex justify-content-between mb-2">
            <h6 className="mb-0">Điều khoản</h6>
            <div className="d-flex gap-2">
              <input
                className="form-control form-control-sm"
                style={{ maxWidth: 180 }}
                placeholder="effectiveAt"
                value={nodesState.effectiveAt}
                onChange={(e) => setNodesState((prev) => ({ ...prev, effectiveAt: e.target.value }))}
              />
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => fetchNodes(selectedLaw, 0)}
                disabled={!selectedLaw || nodesState.loading}
              >
                Làm mới
              </button>
            </div>
          </div>
          {nodesState.error && <div className="alert alert-danger py-2">{nodesState.error}</div>}
          {!selectedLaw && <div className="text-secondary">Chọn luật để xem điều khoản.</div>}
          {selectedLaw && (
            <>
              {nodesState.trail.length > 0 && (
                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                  <span className="badge bg-secondary">Đang xem</span>
                  <button className="btn btn-sm btn-light" onClick={() => goUpTo(0)}>
                    G §c
                  </button>
                  {nodesState.trail.map((node, idx) => (
                    <button
                      key={node.id || idx}
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => goUpTo(idx + 1)}
                    >
                      {truncate(node.title || node.heading || node.ordinalLabel || node.path || node.id, 40)}
                    </button>
                  ))}
                </div>
              )}
              {nodesState.loading && <div className="text-secondary">Đang tải...</div>}
              <div className="scroll-area">
                {nodesState.items.map((node) => (
                  <div
                    key={node.id}
                    className="border-bottom pb-2 mb-2"
                    role="button"
                    onClick={() => goDeeper(node)}
                  >
                    <div className="fw-semibold">{node.title || node.heading || node.ordinalLabel || node.code || node.id}</div>
                    <div className="text-secondary small">{formatPath(node.path || node.reference)}</div>
                    <div>{truncate(node.contentText || node.content || node.text || '', 320)}</div>
                    <div className="mt-1">
                      <button className="btn btn-sm btn-outline-primary" onClick={() => goDeeper(node)}>
                        Xem muc con
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="d-flex justify-content-end gap-2 mt-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={nodesState.loading || !nodesState.hasPrevious}
                  onClick={() => fetchNodes(selectedLaw, Math.max(0, nodesState.page - 1))}
                >
                  Trước
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={nodesState.loading || !nodesState.hasNext}
                  onClick={() => fetchNodes(selectedLaw, nodesState.page + 1)}
                >
                  Sau
                </button>
              </div>
            </>
          )}
        </div>

        <div className="admin-card mb-3">
          <div className="d-flex justify-content-between mb-2">
            <h6 className="mb-0">TOC & liên quan</h6>
            <small className="text-secondary">/toc, /related</small>
          </div>
          {lawDetail.error && <div className="alert alert-danger py-2">{lawDetail.error}</div>}
          {!selectedLaw && <div className="text-secondary">Chọn luật để xem cấu trúc.</div>}
          {selectedLaw && (
            <div className="row g-2">
              <div className="col-12">
                <div className="fw-semibold mb-1">TOC</div>
                <div className="scroll-area small">
                  {lawDetail.toc && lawDetail.toc.length > 0 ? (
                    lawDetail.toc.map((item) => (
                      <div key={item.id || item.code} className="border-bottom pb-1 mb-1">
                        <div className="fw-semibold">{item.code || item.numbering}</div>
                        <div className="text-secondary">{item.title || item.heading}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-secondary">Không có TOC</div>
                  )}
                </div>
              </div>
              <div className="col-12">
                <div className="fw-semibold mb-1">Liên quan</div>
                <div className="scroll-area small">
                  {lawDetail.related && lawDetail.related.length > 0 ? (
                    lawDetail.related.map((item) => (
                      <div key={item.id || item.code} className="border-bottom pb-1 mb-1">
                        <div className="fw-semibold">{item.code || item.id}</div>
                        <div className="text-secondary">{item.title}</div>
                        <div className="text-secondary small">{item.docType}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-secondary">Không có dữ liệu</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="admin-card">
          <div className="d-flex justify-content-between mb-2">
            <h6 className="mb-0">QA sandbox</h6>
            <small className="text-secondary">/api/admin/laws/qa/analyze</small>
          </div>
          <div className="row g-2 mb-2">
            <div className="col-12">
              <textarea
                className="form-control"
                placeholder="Câu hỏi"
                rows={3}
                value={qaState.question}
                onChange={(e) => setQaState((prev) => ({ ...prev, question: e.target.value }))}
              />
            </div>
            <div className="col-6">
              <input
                className="form-control"
                placeholder="effectiveAt (optional)"
                value={qaState.effectiveAt}
                onChange={(e) => setQaState((prev) => ({ ...prev, effectiveAt: e.target.value }))}
              />
            </div>
            <div className="col-6 d-grid">
              <button className="btn btn-primary" onClick={analyzeQa} disabled={qaState.loading || !hasKey}>
                {qaState.loading ? 'Đang gửi...' : 'Analyze'}
              </button>
            </div>
          </div>
          {qaState.error && <div className="alert alert-danger py-2">{qaState.error}</div>}
          {qaState.answer && (
            <div className="border rounded p-2">
              <div className="fw-semibold mb-1">Answer</div>
              <div className="mb-2">{qaState.answer.answer || '--'}</div>
              <div className="fw-semibold mb-1">Decision</div>
              <div className="mb-2">{qaState.answer.decision || '--'}</div>
              <div className="fw-semibold mb-1">Citations</div>
              <div className="small">{JSON.stringify(qaState.answer.citations || [], null, 2)}</div>
              <div className="fw-semibold mb-1 mt-2">Context</div>
              <div className="small">{truncate(qaState.answer.context || '', 600)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="col-12">
        <div className="admin-card">
          <div className="d-flex justify-content-between mb-2">
            <h6 className="mb-0">Upload PDF luật</h6>
            <small className="text-secondary">/api/admin/laws/upload</small>
          </div>
          {uploadState.error && <div className="alert alert-danger py-2">{uploadState.error}</div>}
          {uploadState.message && <div className="alert alert-success py-2">{uploadState.message}</div>}
          <form className="row g-2" onSubmit={uploadLaw}>
            <div className="col-md-4">
              <label className="form-label">PDF</label>
              <input
                type="file"
                accept="application/pdf"
                className="form-control"
                onChange={(e) => setUploadState((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Code</label>
              <input
                className="form-control"
                value={uploadState.code}
                onChange={(e) => setUploadState((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Title</label>
              <input
                className="form-control"
                value={uploadState.title}
                onChange={(e) => setUploadState((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Doc type</label>
              <input
                className="form-control"
                value={uploadState.docType}
                onChange={(e) => setUploadState((prev) => ({ ...prev, docType: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Issuing body</label>
              <input
                className="form-control"
                value={uploadState.issuingBody}
                onChange={(e) => setUploadState((prev) => ({ ...prev, issuingBody: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Promulgation date</label>
              <input
                className="form-control"
                placeholder="YYYY-MM-DD"
                value={uploadState.promulgationDate}
                onChange={(e) => setUploadState((prev) => ({ ...prev, promulgationDate: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Effective date</label>
              <input
                className="form-control"
                placeholder="YYYY-MM-DD"
                value={uploadState.effectiveDate}
                onChange={(e) => setUploadState((prev) => ({ ...prev, effectiveDate: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Expire date</label>
              <input
                className="form-control"
                placeholder="YYYY-MM-DD"
                value={uploadState.expireDate}
                onChange={(e) => setUploadState((prev) => ({ ...prev, expireDate: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Related law ID</label>
              <input
                className="form-control"
                value={uploadState.relatedLawId}
                onChange={(e) => setUploadState((prev) => ({ ...prev, relatedLawId: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Node effective start</label>
              <input
                className="form-control"
                value={uploadState.nodeEffectiveStart}
                onChange={(e) => setUploadState((prev) => ({ ...prev, nodeEffectiveStart: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Node effective end</label>
              <input
                className="form-control"
                value={uploadState.nodeEffectiveEnd}
                onChange={(e) => setUploadState((prev) => ({ ...prev, nodeEffectiveEnd: e.target.value }))}
              />
            </div>
            <div className="col-md-3 d-flex align-items-center gap-2">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="replaceExisting"
                  checked={uploadState.replaceExisting}
                  onChange={(e) => setUploadState((prev) => ({ ...prev, replaceExisting: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="replaceExisting">
                  Replace existing
                </label>
              </div>
            </div>
            <div className="col-md-3 d-flex align-items-center gap-2">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="triggerReindex"
                  checked={uploadState.triggerReindex}
                  onChange={(e) => setUploadState((prev) => ({ ...prev, triggerReindex: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="triggerReindex">
                  Trigger reindex
                </label>
              </div>
            </div>
            <div className="col-md-3 d-grid">
              <button className="btn btn-primary" type="submit" disabled={uploadState.loading || !hasKey}>
                {uploadState.loading ? 'Đang tải...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LawsPage;
