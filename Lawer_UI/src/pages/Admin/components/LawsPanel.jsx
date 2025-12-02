import { useEffect, useMemo, useState } from 'react';
import adminLawService from '../../../services/adminLawService';
import Pager from './Pager';
import { formatDate, pickError } from '../shared';

const PAGE_SIZE = 10;

const LawsPanel = () => {
  const [apiKeyInput, setApiKeyInput] = useState(
    localStorage.getItem('adminApiKey') || import.meta.env.VITE_ADMIN_API_KEY || '',
  );
  const [apiKeySaved, setApiKeySaved] = useState(Boolean(apiKeyInput));
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
  const [selectedLaw, setSelectedLaw] = useState(null);
  const [lawDetailState, setLawDetailState] = useState({ loading: false, error: '' });
  const [tocState, setTocState] = useState({ loading: false, items: [], error: '' });
  const [nodesState, setNodesState] = useState({
    loading: false,
    error: '',
    list: [],
    page: 0,
    hasNext: false,
    effectiveAt: '',
  });
  const [searchNodesState, setSearchNodesState] = useState({
    keyword: '',
    effectiveAt: '',
    loading: false,
    error: '',
    list: [],
  });
  const [fulltextState, setFulltextState] = useState({ q: '', loading: false, error: '', list: [] });
  const [qaState, setQaState] = useState({ question: '', effectiveAt: '', loading: false, error: '', result: null });
  const [suggestState, setSuggestState] = useState({ keyword: '', loading: false, error: '', list: [] });
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

  const currentKey = useMemo(() => apiKeyInput.trim(), [apiKeyInput]);

  const handleSaveKey = () => {
    if (currentKey) {
      localStorage.setItem('adminApiKey', currentKey);
      setApiKeySaved(true);
    } else {
      localStorage.removeItem('adminApiKey');
      setApiKeySaved(false);
    }
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
      setLawListState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Khong tai duoc van ban') }));
    }
  };

  useEffect(() => {
    if (currentKey) {
      fetchLaws(0);
    }
  }, [lawFilters, currentKey]);

  const handleSelectLaw = async (law) => {
    if (!law?.id) return;
    setSelectedLaw(law);
    setLawDetailState({ loading: true, error: '' });
    setTocState((prev) => ({ ...prev, items: [], error: '' }));
    try {
      const res = await adminLawService.getLaw(law.id, currentKey);
      setSelectedLaw(res?.data || law);
      setLawDetailState({ loading: false, error: '' });
    } catch (err) {
      setLawDetailState({ loading: false, error: pickError(err, 'Khong tai duoc chi tiet van ban') });
    }
    loadNodes(law.id, nodesState.effectiveAt, 0);
  };

  const loadToc = async () => {
    if (!selectedLaw?.id) return;
    setTocState({ loading: true, items: [], error: '' });
    try {
      const res = await adminLawService.getToc(selectedLaw.id, currentKey);
      setTocState({ loading: false, items: res?.data || [], error: '' });
    } catch (err) {
      setTocState({ loading: false, items: [], error: pickError(err, 'Khong tai duoc muc luc') });
    }
  };

  const loadNodes = async (lawId, effectiveAt = '', page = 0) => {
    if (!lawId) return;
    setNodesState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await adminLawService.listNodes(lawId, { effectiveAt: effectiveAt || undefined, page, size: 20 }, currentKey);
      const data = res?.data || {};
      setNodesState((prev) => ({
        ...prev,
        loading: false,
        list: data.content || [],
        page: data.page ?? page,
        hasNext: Boolean(data.hasNext),
        effectiveAt,
      }));
    } catch (err) {
      setNodesState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Khong tai duoc node') }));
    }
  };

  const handleSearchNodes = async () => {
    if (!selectedLaw?.id || !searchNodesState.keyword.trim()) return;
    setSearchNodesState((prev) => ({ ...prev, loading: true, error: '', list: [] }));
    try {
      const res = await adminLawService.searchNodes(
        { keyword: searchNodesState.keyword.trim(), effectiveAt: searchNodesState.effectiveAt || undefined, page: 0, size: 20 },
        currentKey,
      );
      const data = res?.data || {};
      setSearchNodesState((prev) => ({
        ...prev,
        loading: false,
        list: data.content || [],
      }));
    } catch (err) {
      setSearchNodesState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Khong tim duoc node') }));
    }
  };

  const handleSearchFulltext = async () => {
    if (!fulltextState.q.trim()) return;
    setFulltextState((prev) => ({ ...prev, loading: true, error: '', list: [] }));
    try {
      const res = await adminLawService.searchNodesFulltext({ q: fulltextState.q.trim(), page: 0, size: 20 }, currentKey);
      const data = res?.data || {};
      setFulltextState((prev) => ({ ...prev, loading: false, list: data.content || [] }));
    } catch (err) {
      setFulltextState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Khong tim duoc (fulltext)') }));
    }
  };

  const handleQaAnalyze = async () => {
    if (!qaState.question.trim()) return;
    setQaState((prev) => ({ ...prev, loading: true, error: '', result: null }));
    try {
      const res = await adminLawService.qaAnalyze({ question: qaState.question.trim() }, { effectiveAt: qaState.effectiveAt || undefined }, currentKey);
      setQaState((prev) => ({ ...prev, loading: false, result: res?.data || null }));
    } catch (err) {
      setQaState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Khong goi duoc QA') }));
    }
  };

  const handleSuggest = async () => {
    const keyword = suggestState.keyword.trim();
    if (!keyword) return;
    setSuggestState((prev) => ({ ...prev, loading: true, error: '', list: [] }));
    try {
      const res = await adminLawService.suggest(keyword, 10, currentKey);
      setSuggestState((prev) => ({ ...prev, loading: false, list: res?.data || [] }));
    } catch (err) {
      setSuggestState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Khong goi y duoc') }));
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadState.file) {
      setUploadState((prev) => ({ ...prev, error: 'Chon file PDF truoc' }));
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
        message: res?.message || 'Da tai len',
        error: '',
      }));
    } catch (err) {
      setUploadState((prev) => ({
        ...prev,
        loading: false,
        error: pickError(err, 'Khong tai duoc PDF'),
      }));
    }
  };

  const renderToc = (items = []) => (
    <ul className="admin__toc">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <strong>{item.label || 'Untitled'}</strong>
            <span className="admin__muted"> (cap {item.level})</span>
          </div>
          {Array.isArray(item.children) && item.children.length > 0 && renderToc(item.children)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="admin__panel">
      <div className="admin__card admin__card--detail">
        <div className="admin__card-header">
          <div>
            <div className="admin__eyebrow">Quan tri luat</div>
            <div className="admin__card-title">X-API-KEY</div>
          </div>
          {apiKeySaved && <span className="pill pill--outline">Da luu</span>}
        </div>
        <div className="admin__form">
          <input
            type="text"
            placeholder="Nhap X-API-KEY"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
          />
          <button type="button" className="admin__btn" onClick={handleSaveKey}>
            Luu key
          </button>
        </div>
        <p className="admin__muted">Tat ca API luat yeu cau header X-API-KEY.</p>
      </div>

      <form className="admin__filters" onSubmit={(e) => { e.preventDefault(); fetchLaws(0); }}>
        <label className="admin__filter">
          <span>Tu khoa</span>
          <input
            type="text"
            placeholder="Ma van ban hoac tieu de"
            value={lawFilters.keyword}
            onChange={(e) => setLawFilters((prev) => ({ ...prev, keyword: e.target.value }))}
          />
        </label>
        <div className="admin__filter admin__filter--actions">
          <button type="submit" className="admin__btn" disabled={!currentKey}>
            Tim
          </button>
          <button
            type="button"
            className="admin__btn admin__btn--ghost"
            onClick={() => {
              setLawFilters({ keyword: '' });
              setSelectedLaw(null);
              setLawListState((prev) => ({ ...prev, items: [] }));
            }}
          >
            Xoa
          </button>
        </div>
      </form>

      <div className="admin__grid">
        <div className="admin__card">
          <div className="admin__card-header">
            <div>
              <div className="admin__eyebrow">Goi y</div>
              <div className="admin__card-title">Autocomplete van ban</div>
            </div>
          </div>
          <div className="admin__form admin__form--split">
            <input
              type="text"
              placeholder="Tu khoa"
              value={suggestState.keyword}
              onChange={(e) => setSuggestState((prev) => ({ ...prev, keyword: e.target.value }))}
            />
            <button type="button" className="admin__btn" onClick={handleSuggest} disabled={suggestState.loading || !currentKey}>
              {suggestState.loading ? 'Dang tai...' : 'Goi y'}
            </button>
          </div>
          {suggestState.error && <div className="admin__alert admin__alert--error">{suggestState.error}</div>}
          <div className="admin__comment-list">
            {suggestState.loading ? (
              <div className="admin__muted">Dang tai...</div>
            ) : suggestState.list.length ? (
              suggestState.list.map((item) => (
                <div key={`${item.code}-${item.title}`} className="admin__comment">
                  <div>
                    <div className="admin__label">{item.code || '--'}</div>
                    <div className="admin__value">{item.title || '--'}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="admin__muted">Chua co goi y.</div>
            )}
          </div>
        </div>

        <div className="admin__card">
          <div className="admin__card-header">
            <div>
              <div className="admin__eyebrow">Tai PDF</div>
              <div className="admin__card-title">/api/admin/laws/upload</div>
            </div>
            {uploadState.message && <span className="pill pill--outline">Done</span>}
          </div>
          <form className="admin__form admin__form--split" onSubmit={handleUpload}>
            <input type="file" accept="application/pdf" onChange={(e) => setUploadState((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} />
            <input
              type="text"
              placeholder="Ma van ban"
              value={uploadState.code}
              onChange={(e) => setUploadState((prev) => ({ ...prev, code: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Tieu de"
              value={uploadState.title}
              onChange={(e) => setUploadState((prev) => ({ ...prev, title: e.target.value }))}
            />
            <input
              type="date"
              value={uploadState.effectiveDate}
              onChange={(e) => setUploadState((prev) => ({ ...prev, effectiveDate: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Loai van ban (LAW,DECREE...)"
              value={uploadState.docType}
              onChange={(e) => setUploadState((prev) => ({ ...prev, docType: e.target.value }))}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={uploadState.replaceExisting}
                onChange={(e) => setUploadState((prev) => ({ ...prev, replaceExisting: e.target.checked }))}
              />
              <span>Ghi de neu ton tai</span>
            </label>
            <button type="submit" className="admin__btn" disabled={uploadState.loading || !currentKey}>
              {uploadState.loading ? 'Dang tai len...' : 'Tai len'}
            </button>
          </form>
          {uploadState.error && <div className="admin__alert admin__alert--error">{uploadState.error}</div>}
          {uploadState.message && <div className="admin__alert admin__alert--success">{uploadState.message}</div>}
        </div>
      </div>

      <div className="admin__grid">
        <div className="admin__card">
          <div className="admin__card-header">
            <div>
              <div className="admin__eyebrow">Van ban</div>
              <div className="admin__card-title">Ket qua tim</div>
            </div>
            <div className="admin__card-actions">
              <button
                type="button"
                className="admin__btn admin__btn--ghost"
                onClick={() => fetchLaws(lawListState.page)}
                disabled={lawListState.loading || !currentKey}
              >
                Tai lai
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
                  <th>Ma</th>
                  <th>Loai</th>
                  <th>Tieu de</th>
                  <th>Hieu luc</th>
                </tr>
              </thead>
              <tbody>
                {lawListState.loading ? (
                  <tr>
                    <td colSpan="5" className="admin__muted">
                      Dang tai van ban...
                    </td>
                  </tr>
                ) : lawListState.items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="admin__muted">
                      Khong co van ban.
                    </td>
                  </tr>
                ) : (
                  lawListState.items.map((law) => (
                    <tr
                      key={law.id}
                      className={selectedLaw?.id === law.id ? 'is-selected' : ''}
                      onClick={() => handleSelectLaw(law)}
                    >
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

        <div className="admin__card admin__card--detail">
          <div className="admin__card-header">
            <div>
              <div className="admin__eyebrow">Chi tiet van ban</div>
              <div className="admin__card-title">
                {selectedLaw ? selectedLaw.title || selectedLaw.code || 'Van ban' : 'Chon van ban'}
              </div>
            </div>
            {selectedLaw && <span className="pill pill--outline">#{selectedLaw.id}</span>}
          </div>

          {!selectedLaw ? (
            <p className="admin__muted">Chon van ban de xem node va QA sandbox.</p>
          ) : (
            <>
              {lawDetailState.error && <div className="admin__alert admin__alert--error">{lawDetailState.error}</div>}
              <div className="admin__meta admin__meta--grid">
                <div>
                  <div className="admin__label">Ma</div>
                  <div className="admin__value">{selectedLaw.code || '--'}</div>
                </div>
                <div>
                  <div className="admin__label">Loai</div>
                  <div className="admin__value">{selectedLaw.docType || '--'}</div>
                </div>
                <div>
                  <div className="admin__label">Hieu luc</div>
                  <div className="admin__value">{formatDate(selectedLaw.effectiveDate)}</div>
                </div>
                <div>
                  <div className="admin__label">Het hieu luc</div>
                  <div className="admin__value">{formatDate(selectedLaw.expireDate)}</div>
                </div>
                <div>
                  <div className="admin__label">Trang thai</div>
                  <div className="admin__value">{selectedLaw.status || '--'}</div>
                </div>
              </div>

              <div className="admin__form admin__form--split">
                <button type="button" className="admin__btn" onClick={loadToc} disabled={tocState.loading}>
                  {tocState.loading ? 'Dang tai muc luc...' : 'Tai muc luc'}
                </button>
                <button type="button" className="admin__btn admin__btn--ghost" onClick={() => loadNodes(selectedLaw.id, nodesState.effectiveAt, 0)}>
                  Tai node
                </button>
              </div>

              {tocState.error && <div className="admin__alert admin__alert--error">{tocState.error}</div>}
              {tocState.items.length > 0 && (
                <div className="admin__toc-box">
                  <div className="admin__label">Muc luc</div>
                  {renderToc(tocState.items)}
                </div>
              )}

              <div className="admin__section">
                <div className="admin__section-header">
                  <div>
                    <div className="admin__eyebrow">Cac node</div>
                    <div className="admin__card-title">Nodes of law</div>
                  </div>
                  <div className="admin__form admin__form--split">
                    <input
                      type="date"
                      value={nodesState.effectiveAt}
                      onChange={(e) => setNodesState((prev) => ({ ...prev, effectiveAt: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="admin__btn"
                      onClick={() => loadNodes(selectedLaw.id, nodesState.effectiveAt, 0)}
                    >
                      Ap dung
                    </button>
                  </div>
                </div>
                {nodesState.error && <div className="admin__alert admin__alert--error">{nodesState.error}</div>}
                <div className="admin__comment-list">
                  {nodesState.loading ? (
                    <div className="admin__muted">Dang tai node...</div>
                  ) : nodesState.list.length ? (
                    nodesState.list.map((node) => (
                      <div key={node.id} className="admin__comment">
                        <div>
                          <div className="admin__label">#{node.id}</div>
                          <div className="admin__value admin__value--box">{node.contentText || node.heading || node.title}</div>
                          <div className="admin__muted">Cap {node.level} - Path {node.path}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="admin__muted">Khong co node.</div>
                  )}
                </div>
              </div>

              <div className="admin__section">
                <div className="admin__section-header">
                  <div className="admin__eyebrow">Tim node (LIKE)</div>
                </div>
                <div className="admin__form admin__form--split">
                  <input
                    type="text"
                    placeholder="Tu khoa"
                    value={searchNodesState.keyword}
                    onChange={(e) => setSearchNodesState((prev) => ({ ...prev, keyword: e.target.value }))}
                  />
                  <input
                    type="date"
                    value={searchNodesState.effectiveAt}
                    onChange={(e) => setSearchNodesState((prev) => ({ ...prev, effectiveAt: e.target.value }))}
                  />
                  <button type="button" className="admin__btn" onClick={handleSearchNodes}>
                    Tim
                  </button>
                </div>
                {searchNodesState.error && (
                  <div className="admin__alert admin__alert--error">{searchNodesState.error}</div>
                )}
                <div className="admin__comment-list">
                  {searchNodesState.loading ? (
                    <div className="admin__muted">Dang tim node...</div>
                  ) : searchNodesState.list.length ? (
                    searchNodesState.list.map((node) => (
                      <div key={node.id} className="admin__comment">
                        <div>
                          <div className="admin__label">#{node.id}</div>
                          <div className="admin__value admin__value--box">{node.contentText || node.heading || node.title}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="admin__muted">Khong co ket qua.</div>
                  )}
                </div>
              </div>

              <div className="admin__section">
                <div className="admin__section-header">
                  <div className="admin__eyebrow">Tim fulltext</div>
                </div>
                <div className="admin__form admin__form--split">
                  <input
                    type="text"
                    placeholder="q"
                    value={fulltextState.q}
                    onChange={(e) => setFulltextState((prev) => ({ ...prev, q: e.target.value }))}
                  />
                  <button type="button" className="admin__btn" onClick={handleSearchFulltext}>
                    Tim
                  </button>
                </div>
                {fulltextState.error && (
                  <div className="admin__alert admin__alert--error">{fulltextState.error}</div>
                )}
                <div className="admin__comment-list">
                  {fulltextState.loading ? (
                    <div className="admin__muted">Dang tim fulltext...</div>
                  ) : fulltextState.list.length ? (
                    fulltextState.list.map((item) => (
                      <div key={item.id} className="admin__comment">
                        <div>
                          <div className="admin__label">#{item.id}</div>
                          <div className="admin__value admin__value--box">{item.highlight || item.content}</div>
                          <div className="admin__muted">Score {item.score ?? '--'}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="admin__muted">Khong co ket qua.</div>
                  )}
                </div>
              </div>

              <div className="admin__section">
                <div className="admin__section-header">
                  <div className="admin__eyebrow">QA sandbox</div>
                </div>
                <div className="admin__form admin__form--split">
                  <input
                    type="text"
                    placeholder="Cau hoi"
                    value={qaState.question}
                    onChange={(e) => setQaState((prev) => ({ ...prev, question: e.target.value }))}
                  />
                  <input
                    type="date"
                    value={qaState.effectiveAt}
                    onChange={(e) => setQaState((prev) => ({ ...prev, effectiveAt: e.target.value }))}
                  />
                  <button type="button" className="admin__btn" onClick={handleQaAnalyze}>
                    Phan tich
                  </button>
                </div>
                {qaState.error && <div className="admin__alert admin__alert--error">{qaState.error}</div>}
                {qaState.loading && <div className="admin__muted">Dang goi QAService...</div>}
                {qaState.result && (
                  <div className="admin__comment">
                    <div>
                      <div className="admin__label">Quyet dinh</div>
                      <div className="admin__value">{qaState.result.decision || '--'}</div>
                      <div className="admin__label">Tra loi</div>
                      <div className="admin__value admin__value--box">{qaState.result.answer || '(trong)'}</div>
                      {qaState.result.explanation && (
                        <>
                          <div className="admin__label">Giai thich</div>
                          <div className="admin__value admin__value--box">{qaState.result.explanation}</div>
                        </>
                      )}
                    </div>
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

export default LawsPanel;
