import { useEffect, useMemo, useRef, useState } from 'react';
import ragService from '../../services/ragService';
import './Rag.css';

const prettyDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('vi-VN', { hour12: false });
  } catch {
    return value;
  }
};

const escapeHtml = (text = '') =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatAnswer = (text = '') => {
  const safe = escapeHtml(text);
  return safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '<br /><br />')
    .replace(/\n/g, '<br />');
};

const normalizeCitations = (citations) =>
  (Array.isArray(citations) ? citations : []).map((item, idx) => ({
    id: item?.nodeId ?? item?.node_id ?? idx,
    lawCode: item?.lawCode || item?.law_code || item?.law || 'Tài liệu',
    nodePath: item?.nodePath || item?.node_path || item?.path || '',
  }));

const Rag = () => {
  const [question, setQuestion] = useState('');
  const [effectiveAt, setEffectiveAt] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'assistant',
      decision: 'INFO',
      answer:
        'Xin chào! Tôi là Trợ lý Pháp lý. Nhập câu hỏi và (nếu cần) chọn ngày hiệu lực để tôi tra cứu đúng quy định.',
      explanation: 'Enter để gửi · Shift + Enter để xuống dòng.',
      citations: [],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const feedRef = useRef(null);
  const latestDecision = useMemo(() => {
    const last = [...messages].reverse().find((msg) => msg.role === 'assistant' && msg.decision);
    return (last?.decision || 'INFO').toUpperCase();
  }, [messages]);

  useEffect(() => {
    if (!feedRef.current) return;
    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages, loading]);

  const handleSend = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setError('');

    const userMsg = { id: `u-${Date.now()}`, role: 'user', question: trimmed, effectiveAt };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const payload = await ragService.askQuestion({
        question: trimmed,
        effectiveAt: effectiveAt || undefined,
        k: 10,
      });

      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        decision: payload?.decision || 'INFO',
        effectiveAt: payload?.effectiveAt || payload?.effective_at || '',
        answer: payload?.answer || 'Không tìm thấy câu trả lời phù hợp.',
        explanation: payload?.explanation || '',
        citations: normalizeCitations(payload?.citations),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Gửi yêu cầu thất bại. Vui lòng kiểm tra kết nối hoặc API RAG.';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          decision: 'INFO',
          answer: 'Không thể xử lý câu hỏi ngay lúc này.',
          explanation: msg,
          citations: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="rag-layout">
      <aside className="rag-sidebar">
        <div className="rag-sidebar__header">
          <div className="rag-select">
            <span className="rag-select__label">Workspace</span>
            <button type="button" className="rag-select__control">
              Chọn workspace...
            </button>
          </div>
          <button type="button" className="rag-primary-btn" onClick={() => setMessages([messages[0]])}>
            + New Chat
          </button>
        </div>
        <div className="rag-sidebar__search">
          <input type="text" placeholder="Search chats..." disabled />
        </div>
        <div className="rag-sidebar__empty">No chats.</div>
      </aside>

      <main className="rag-main">
        <header className="rag-topbar">
          <div className="rag-topbar__left">
            <span className="rag-topbar__title">Trợ lý Pháp lý</span>
            <span className="chip chip-strong">Decision: {latestDecision}</span>
          </div>
          <div className="rag-topbar__right" />
        </header>

        <div className="rag-chat">
          <div className="rag-feed" ref={feedRef}>
            {messages.map((msg) =>
              msg.role === 'assistant' ? (
                <div key={msg.id} className="rag-msg rag-msg--assistant">
                  <div className="rag-msg__header">
                    <span className="rag-label">Trợ lý Pháp lý</span>
                    {msg.decision && <span className="chip chip-soft">Decision: {msg.decision}</span>}
                    {msg.effectiveAt && <span className="chip chip-ghost">Hiệu lực: {prettyDate(msg.effectiveAt)}</span>}
                  </div>

                  <div className="rag-section">
                    <div className="rag-section__title">Tư vấn pháp lý</div>
                    <div className="rag-answer" dangerouslySetInnerHTML={{ __html: formatAnswer(msg.answer) }} />
                  </div>

                  {msg.explanation && (
                    <div className="rag-section">
                      <div className="rag-section__title">Giải thích</div>
                      <p className="rag-note">{msg.explanation}</p>
                    </div>
                  )}

                  {Array.isArray(msg.citations) && msg.citations.length > 0 && (
                    <div className="rag-section">
                      <div className="rag-section__title">📚 Tài liệu Tham khảo</div>
                      <ul className="rag-citations">
                        {msg.citations.map((cite) => (
                          <li key={cite.id} className="rag-citation">
                            <strong>{cite.lawCode}</strong>
                            {cite.nodePath && <span className="rag-citation__path">{cite.nodePath}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div key={msg.id} className="rag-msg rag-msg--user">
                  <div className="rag-msg__header">
                    <span className="rag-label">Bạn</span>
                    {msg.effectiveAt && <span className="chip chip-ghost">Hiệu lực: {msg.effectiveAt}</span>}
                  </div>
                  <div className="rag-answer">{msg.question}</div>
                </div>
              ),
            )}

            {loading && <div className="rag-loading">Đang xử lý yêu cầu...</div>}
          </div>

          <div className="rag-composer">
            <div className="rag-effective">
              <label htmlFor="rag-effective">Ngày hiệu lực (tuỳ chọn)</label>
              <input
                id="rag-effective"
                type="date"
                value={effectiveAt}
                onChange={(e) => setEffectiveAt(e.target.value)}
              />
            </div>
            <div className="rag-input-row">
              <textarea
                id="rag-question"
                value={question}
                placeholder="Send a message..."
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button type="button" className="rag-send" onClick={handleSend} disabled={loading || !question.trim()}>
                {loading ? 'Đang gửi...' : 'Gửi'}
              </button>
            </div>
            {error && <div className="rag-error">{error}</div>}
            <div className="rag-hint">Enter để gửi · Shift + Enter để xuống dòng</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Rag;
