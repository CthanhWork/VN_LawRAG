import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { callService } from '../../configs/gateway';
import { MoreIcon, SendIcon } from '../../components/Home/BentoIcons';
import { UserContext } from '../../contexts/UserContext';
import './Chatbot.css';

const STORAGE_KEY = 'vnlaw.chatbot.sessions';
const ENDPOINT_PATH = '/api/qa/analyze';

const introMessage = {
  id: 'intro',
  role: 'assistant',
  text: 'Chao ban! Tro ly phap ly VN Law san sang ho tro. Dat cau hoi hoac nhan Enter de gui.',
  createdAt: new Date().toISOString(),
};

const helperNotes = [
  'He thong goi API QA qua gateway, ho tro van ban phap luat da duoc nhung.',
  'Nhan Enter de gui, Shift + Enter de xuong dong. Cau hoi duoc luu trong bo nho trinh duyet.',
  'Moi cau tra loi co the kem quyet dinh va trich dan neu backend tra ve.',
];

const safeDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('vi-VN', { hour12: false });
  } catch (err) {
    return '';
  }
};

const normalizeCitations = (items) =>
  (Array.isArray(items) ? items : []).map((item, idx) => ({
    id: item?.nodeId ?? item?.node_id ?? idx,
    law: item?.lawCode || item?.law_code || item?.code || 'Trich dan',
    path: item?.nodePath || item?.node_path || item?.path || '',
  }));

const createSession = (index = 1) => ({
  id: `s-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
  title: `Chat ${index}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [introMessage],
});

const loadSessions = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((session, idx) => ({
      ...session,
      title: session?.title || `Chat ${idx + 1}`,
      messages: Array.isArray(session?.messages) && session.messages.length > 0 ? session.messages : [introMessage],
    }));
  } catch (err) {
    return [];
  }
};

const Chatbot = () => {
  const { user } = useContext(UserContext);
  const initialSessions = loadSessions();
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState(initialSessions[0]?.id || '');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const feedRef = useRef(null);

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId],
  );

  useEffect(() => {
    if (sessions.length === 0) {
      const first = createSession(1);
      setSessions([first]);
      setActiveSessionId(first.id);
    }
  }, [sessions.length]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    if (sessions.length > 0 && !sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (!feedRef.current) return;
    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [sessions, activeSessionId, sending]);

  const pushMessage = (sessionId, message) => {
    const stampedMessage = {
      ...message,
      createdAt: message?.createdAt || new Date().toISOString(),
    };
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...(session.messages || []), stampedMessage],
              updatedAt: stampedMessage.createdAt,
            }
          : session,
      ),
    );
  };

  const maybeRenameSession = (sessionId, question) => {
    const trimmed = (question || '').trim();
    if (!trimmed) return;
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        const isDefault = !session.title || /^Chat\s/i.test(session.title);
        if (!isDefault) return session;
        const shortTitle = trimmed.length > 48 ? `${trimmed.slice(0, 48)}...` : trimmed;
        return { ...session, title: shortTitle };
      }),
    );
  };

  const handleNewChat = () => {
    const next = createSession(sessions.length + 1);
    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
    setInput('');
    setError('');
  };

  const handleRename = (sessionId, currentTitle) => {
    const nextTitle = window.prompt('Doi ten cuoc tro chuyen', currentTitle || 'Chat');
    const safe = (nextTitle || '').trim();
    if (!safe) return;
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? { ...session, title: safe } : session)));
  };

  const handleSend = async (overrideText) => {
    if (!activeSession || sending) return;
    const content = (overrideText ?? input).trim();
    if (!content) return;

    const sessionId = activeSession.id;
    setSending(true);
    setError('');
    setInput('');

    pushMessage(sessionId, { id: `u-${Date.now()}`, role: 'user', text: content });
    maybeRenameSession(sessionId, content);

    try {
      const response = await callService('gateway', {
        method: 'post',
        url: ENDPOINT_PATH,
        data: { question: content },
      });
      const payload = response?.data || {};
      const answer = payload?.answer || payload?.data?.answer || 'Khong nhan duoc tra loi tu API.';
      const decision = payload?.decision || payload?.data?.decision;
      const citations = normalizeCitations(payload?.citations || payload?.data?.citations);

      pushMessage(sessionId, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: answer,
        decision,
        citations,
      });
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Khong the gui cau hoi. Vui long kiem tra API gateway.';
      setError(message);
      pushMessage(sessionId, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: 'Xin loi, co loi xay ra khi xu ly cau hoi.',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const previewSession = (session) => {
    const last = (session?.messages || []).slice(-1)[0];
    const text = last?.text || '';
    if (text.length <= 54) return text;
    return `${text.slice(0, 54)}...`;
  };

  const messageCount = (activeSession?.messages || []).filter((msg) => msg.role === 'user').length;
  const userInitial = useMemo(
    () => (user?.displayName || user?.email || 'U')[0].toUpperCase(),
    [user],
  );

  return (
    <div className="chatbot-page shell-container">
      <div className="chatbot__grid">
        <aside className="chatbot__sidebar page-card">
          <div className="chatbot__sidebar-head">
            <div>
              <p className="chatbot__eyebrow">VN Law</p>
              <h2 className="chatbot__title">Chatbot phap ly</h2>
              <p className="chatbot__muted">
                Giu rieng cac cuoc hoi dap, lay goi y tu tro ly AI va xem nhanh nguon trich dan.
              </p>
            </div>
            <button type="button" className="chatbot__new-btn" onClick={handleNewChat}>
              + Cuoc chat moi
            </button>
          </div>

          <div className="chatbot__sidebar-section">
            <div className="chatbot__section-head">
              <span>Cuoc tro chuyen</span>
              <span className="chatbot__pill">{sessions.length}</span>
            </div>
            <div className="chatbot__session-list">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={`chatbot__session ${session.id === activeSession?.id ? 'is-active' : ''}`}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <div className="chatbot__session-top">
                    <span className="chatbot__session-title">{session.title}</span>
                    <button
                      type="button"
                      className="chatbot__session-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRename(session.id, session.title);
                      }}
                    >
                      <MoreIcon size={18} />
                    </button>
                  </div>
                  <div className="chatbot__session-meta">
                    <span>{safeDate(session.updatedAt || session.createdAt)}</span>
                    <span>{previewSession(session) || 'Khong co noi dung'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="chatbot__sidebar-section chatbot__notes">
            <div className="chatbot__section-head">
              <span>Ghi chu nhanh</span>
            </div>
            {helperNotes.map((note, idx) => (
              <div key={idx} className="chatbot__note">
                {note}
              </div>
            ))}
          </div>
        </aside>

        <main className="chatbot__main page-card">
          <div className="chatbot__topbar">
            <div className="chatbot__topbar-left">
              <span className="chatbot__badge chatbot__badge--soft">
                Tin nhan: {messageCount} • Cap nhat: {safeDate(activeSession?.updatedAt) || '--'}
              </span>
              <div className="chatbot__user">
                <div className="chatbot__user-avatar">
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" /> : userInitial}
                </div>
                <div className="chatbot__user-info">
                  <div className="chatbot__user-name">{user?.displayName || 'Ban'}</div>
                  <div className="chatbot__user-email">{user?.email || 'Chua co email'}</div>
                </div>
              </div>
            </div>
            <div className="chatbot__status">
              <span className={`chatbot__dot ${sending ? 'is-active' : ''}`} />
              {sending ? 'Dang xu ly' : 'San sang'}
            </div>
          </div>

          <div className="chatbot__feed" ref={feedRef}>
            {(activeSession?.messages || []).map((msg) => (
              <div key={msg.id} className={`chatbot__msg chatbot__msg--${msg.role}`}>
                <div className="chatbot__avatar">{msg.role === 'assistant' ? 'AI' : 'Ban'}</div>
                <div className="chatbot__msg-body">
                  <div className="chatbot__msg-meta">
                    <span className="chatbot__meta-chip">{msg.role === 'assistant' ? 'VN Law' : 'Ban'}</span>
                    {msg.decision && (
                      <span className="chatbot__meta-chip chatbot__meta-chip--ghost">Quyet dinh: {msg.decision}</span>
                    )}
                    <span className="chatbot__meta-time">{safeDate(msg.createdAt)}</span>
                  </div>
                  <div className="chatbot__bubble">
                    <div className="chatbot__text">{msg.text}</div>
                    {Array.isArray(msg.citations) && msg.citations.length > 0 && (
                      <div className="chatbot__citations">
                        <div className="chatbot__citations-title">Nguon tham khao</div>
                        <div className="chatbot__citation-list">
                          {msg.citations.map((cite) => (
                            <div key={cite.id} className="chatbot__citation">
                              <strong>{cite.law}</strong>
                              {cite.path && <span>{cite.path}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {sending && <div className="chatbot__typing">AI dang tra loi...</div>}
          </div>

          <div className="chatbot__composer">
            <label className="chatbot__label" htmlFor="chatbot-input">
              Nhap cau hoi cho tro ly phap ly
            </label>
            <div className="chatbot__input-row">
              <textarea
                id="chatbot-input"
                value={input}
                placeholder="Vi du: Toi can dang ky ket hon thi chuan bi giay to gi?"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <button type="button" className="chatbot__send" onClick={() => handleSend()} disabled={sending || !input.trim()}>
                <SendIcon size={18} />
                {sending ? 'Dang gui' : 'Gui'}
              </button>
            </div>
            {error && <div className="chatbot__error">{error}</div>}
            <div className="chatbot__hint">
              <span>Enter de gui, Shift + Enter de xuong dong. Noi dung duoc luu cuc bo.</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Chatbot;
