import { useEffect, useState } from 'react';
import ragAdminService from '../../../services/ragAdminService';
import { pickError } from '../shared';

const RagPanel = () => {
  const [state, setState] = useState({ loading: false, error: '', info: null, message: '' });
  const [patternsMsg, setPatternsMsg] = useState('');

  const loadStatus = async () => {
    setState((prev) => ({ ...prev, loading: true, error: '', message: '' }));
    try {
      const res = await ragAdminService.getStatus();
      setState((prev) => ({ ...prev, loading: false, info: res?.data || null }));
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Khong tai duoc trang thai RAG') }));
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleReloadPatterns = async () => {
    setPatternsMsg('');
    setState((prev) => ({ ...prev, error: '' }));
    try {
      const res = await ragAdminService.reloadPatterns();
      setPatternsMsg(res?.message || (res?.reloaded ? 'Da nap lai patterns' : 'Da thu nap lai patterns'));
    } catch (err) {
      setState((prev) => ({ ...prev, error: pickError(err, 'Khong nap lai duoc patterns') }));
    }
  };

  const handleReindex = async () => {
    const ok = window.confirm('Reindex se xoa collection hien tai. Tiep tuc?');
    if (!ok) return;
    setState((prev) => ({ ...prev, loading: true, error: '', message: '' }));
    try {
      const res = await ragAdminService.reindex();
      const msg = res?.message || 'Da gui yeu cau reindex (da xoa collection). Chay ingest de nap lai.';
      setState((prev) => ({ ...prev, loading: false, message: msg }));
      loadStatus();
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Khong reindex duoc') }));
    }
  };

  return (
    <div className="admin__panel">
      <div className="admin__card">
        <div className="admin__card-header">
          <div>
            <div className="admin__eyebrow">RAG Admin</div>
            <div className="admin__card-title">Trang thai</div>
          </div>
          <div className="admin__card-actions">
            <button type="button" className="admin__btn admin__btn--ghost" onClick={loadStatus} disabled={state.loading}>
              Lam moi
            </button>
            <button type="button" className="admin__btn admin__btn--ghost" onClick={handleReloadPatterns} disabled={state.loading}>
              Nap lai patterns
            </button>
            <button type="button" className="admin__btn admin__btn--danger" onClick={handleReindex} disabled={state.loading}>
              Reindex (xoa chi muc)
            </button>
          </div>
        </div>
        {state.error && <div className="admin__alert admin__alert--error">{state.error}</div>}
        {patternsMsg && <div className="admin__alert admin__alert--success">{patternsMsg}</div>}
        {state.message && <div className="admin__alert admin__alert--success">{state.message}</div>}
        {state.loading && <div className="admin__muted">Dang tai...</div>}
        {state.info && (
          <div className="admin__meta">
            <div>
              <div className="admin__label">San sang</div>
              <div className="admin__value">{String(state.info.ready)}</div>
            </div>
            <div>
              <div className="admin__label">So vector</div>
              <div className="admin__value">{state.info.vector_count ?? '--'}</div>
            </div>
            <div>
              <div className="admin__label">LLM</div>
              <div className="admin__value">
                {state.info.llm
                  ? `${state.info.llm.ready ? 'ready' : 'not ready'} | ${state.info.llm.provider || 'provider?'} | ${state.info.llm.model || 'model?'}`
                  : state.info.llm_status || '--'}
              </div>
            </div>
          </div>
        )}
        <p className="admin__muted">
          Sau khi reindex xoa collection, hay chay quy trinh ingest/embedding de nap lai du lieu.
        </p>
      </div>
    </div>
  );
};

export default RagPanel;
