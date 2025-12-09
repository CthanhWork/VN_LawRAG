import { useState } from 'react';
import adminLawService from '../../services/adminLawService';
import { pickError, truncate } from './shared';

const QaSandboxPage = () => {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem('adminLawKey') || '');
  const [form, setForm] = useState({ question: '', effectiveAt: '' });
  const [state, setState] = useState({ loading: false, error: '', answer: null });

  const saveKey = () => {
    const next = (apiKey || '').trim();
    if (next) {
      sessionStorage.setItem('adminLawKey', next);
    } else {
      sessionStorage.removeItem('adminLawKey');
    }
    setApiKey(next);
  };

  const analyze = async () => {
    if (!apiKey) {
      setState((prev) => ({ ...prev, error: 'Nhập X-API-KEY' }));
      return;
    }
    setState({ loading: true, error: '', answer: null });
    try {
      const res = await adminLawService.qaAnalyze(
        { question: form.question },
        { effectiveAt: form.effectiveAt },
        apiKey,
      );
      setState({ loading: false, error: '', answer: res?.data || res || {} });
    } catch (err) {
      setState({ loading: false, error: pickError(err, 'Không analyze được'), answer: null });
    }
  };

  return (
    <div className="row g-3">
      <div className="col-xl-4">
        <div className="admin-card">
          <h6 className="mb-2">QA sandbox</h6>
          <div className="mb-2">
            <label className="form-label">X-API-KEY</label>
            <div className="d-flex gap-2">
              <input
                type="password"
                className="form-control"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Dán X-API-KEY"
              />
              <button className="btn btn-outline-secondary" type="button" onClick={saveKey}>
                Lưu
              </button>
            </div>
          </div>
          <div className="mb-2">
            <label className="form-label">Câu hỏi</label>
            <textarea
              className="form-control"
              rows={4}
              value={form.question}
              onChange={(e) => setForm((prev) => ({ ...prev, question: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">effectiveAt (tùy chọn)</label>
            <input
              className="form-control"
              value={form.effectiveAt}
              onChange={(e) => setForm((prev) => ({ ...prev, effectiveAt: e.target.value }))}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <button className="btn btn-primary w-100" onClick={analyze} disabled={state.loading}>
            {state.loading ? 'Đang gửi...' : 'Analyze'}
          </button>
          {state.error && <div className="alert alert-danger py-2 mt-2">{state.error}</div>}
        </div>
      </div>

      <div className="col-xl-8">
        <div className="admin-card">
          <h6 className="mb-2">Kết quả</h6>
          {!state.answer && <div className="text-secondary">Chưa có kết quả.</div>}
          {state.answer && (
            <div className="row g-2">
              <div className="col-12">
                <div className="fw-semibold">Answer</div>
                <div className="border rounded p-2 bg-light">{state.answer.answer || '--'}</div>
              </div>
              <div className="col-12">
                <div className="fw-semibold">Decision</div>
                <div className="border rounded p-2 bg-light">{state.answer.decision || '--'}</div>
              </div>
              <div className="col-12">
                <div className="fw-semibold">Citations</div>
                <div className="small border rounded p-2 bg-white">
                  {Array.isArray(state.answer.citations) && state.answer.citations.length
                    ? state.answer.citations.map((c, idx) => <div key={idx}>{JSON.stringify(c)}</div>)
                    : '--'}
                </div>
              </div>
              <div className="col-12">
                <div className="fw-semibold">Context</div>
                <div className="small border rounded p-2 bg-white">
                  {truncate(state.answer.context || '', 1200) || '--'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QaSandboxPage;
