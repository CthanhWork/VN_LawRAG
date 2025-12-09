import { useEffect, useState } from 'react';
import ragAdminService from '../../services/ragAdminService';
import { pickError } from './shared';

const RagOpsPage = () => {
  const [state, setState] = useState({ loading: false, error: '', message: '', info: null });

  const loadStatus = async () => {
    setState((prev) => ({ ...prev, loading: true, error: '', message: '' }));
    try {
      const res = await ragAdminService.getStatus();
      const info = res?.data || res || {};
      setState((prev) => ({ ...prev, loading: false, info }));
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: pickError(err, 'Không tải trạng thái') }));
    }
  };

  const run = async (action, label) => {
    setState((prev) => ({ ...prev, loading: true, error: '', message: '' }));
    try {
      const res = await action();
      setState((prev) => ({ ...prev, loading: false, message: res?.message || `${label} thành công` }));
      loadStatus();
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: pickError(err, `${label} thất bại`) }));
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="row g-3">
      <div className="col-lg-8">
        <div className="admin-card">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Vận hành RAG</h6>
            <small className="text-secondary">/admin/status · /reindex · /reload_patterns</small>
          </div>
          {state.error && <div className="alert alert-danger py-2">{state.error}</div>}
          {state.message && <div className="alert alert-success py-2">{state.message}</div>}
          <div className="row g-2">
            <div className="col-md-6">
              <div className="border rounded p-2">
                <div className="text-secondary small">Sẵn sàng</div>
                <div className="fw-semibold">{String(state.info?.ready ?? '--')}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="border rounded p-2">
                <div className="text-secondary small">Vector count</div>
                <div className="fw-semibold">{state.info?.vector_count ?? '--'}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="border rounded p-2">
                <div className="text-secondary small">LLM model</div>
                <div className="fw-semibold">{state.info?.llm_model || '--'}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="border rounded p-2">
                <div className="text-secondary small">Datasource</div>
                <div className="fw-semibold">{state.info?.data_source || '--'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="admin-card">
          <h6>Hành động</h6>
          <div className="d-grid gap-2">
            <button className="btn btn-outline-secondary" onClick={loadStatus} disabled={state.loading}>
              Làm mới trạng thái
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={() => run(ragAdminService.reloadPatterns, 'Reload patterns')}
              disabled={state.loading}
            >
              Reload patterns
            </button>
            <button
              className="btn btn-danger"
              onClick={() => run(ragAdminService.reindex, 'Reindex')}
              disabled={state.loading}
            >
              Reindex (xóa & embed lại)
            </button>
            <div className="alert alert-warning py-2 mb-0">
              Reindex sẽ xóa toàn bộ vector trước khi nhúng lại.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RagOpsPage;
