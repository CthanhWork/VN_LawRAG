import { useState } from 'react';
import { CloseIcon } from './BentoIcons';
import { callService } from '../../configs/gateway';
import './HomeShared.css';

const promptSuggestions = [
  'Thủ tục ly hôn?',
  'Quyền lợi người lao động?',
  'Luật đất đai mới nhất?',
  'Thành lập doanh nghiệp?',
  'Khiếu nại hành chính?',
];

const ChatWidget = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Chào bạn, tôi là Trợ lý AI của VN Law RAG. Tôi sẵn sàng giải đáp các thắc mắc về pháp luật Việt Nam. Hãy đặt câu hỏi của bạn.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setShowPrompts(false);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    try {
      const res = await callService('gateway', {
        method: 'post',
        url: '/api/qa/analyze',
        data: { question: text },
      });
      const data = res?.data || {};
      const answer =
        data?.answer ||
        data?.data?.answer ||
        'Đã nhận câu hỏi, vui lòng thử lại nếu chưa có trả lời.';
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Xin lỗi, không gửi được câu hỏi. Vui lòng thử lại.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          className="chat-widget__launcher"
          onClick={() => {
            setShowPrompts(true);
            setOpen(true);
          }}
          aria-label="Mở Trợ lý Pháp lý VN"
        >
          <span className="chat-widget__icon" role="img" aria-label="law">
            AI
          </span>
        </button>
      )}

      {open && (
        <div className="chat-widget__popup">
          <div className="chat-widget page-card">
            <div className="chat-widget__head chat-widget__head--popup">
              <div className="chat-widget__heading">
                <span className="chat-widget__icon" role="img" aria-label="law">
                  AI
                </span>
                <div>
                  <h3 className="chat-widget__title">Trợ lý Pháp lý VN</h3>
                  <p className="chat-widget__subtitle">Hỏi đáp pháp luật, nhận gợi ý nhanh.</p>
                </div>
              </div>
              <button
                type="button"
                className="chat-widget__close"
                onClick={() => setOpen(false)}
                aria-label="Đóng chat"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="chat-widget__body">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-widget__bubble chat-widget__bubble--${msg.role}`}>
                  {msg.text}
                </div>
              ))}
              {showPrompts && (
                <div className="chat-widget__prompts">
                  {promptSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="chat-widget__prompt"
                      onClick={() => setInput(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form className="chat-widget__form" onSubmit={handleSend}>
              <div className="chat-widget__input-wrap chat-widget__input-wrap--plain">
                <input
                  type="text"
                  placeholder="Nhập câu hỏi pháp lý của bạn..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" className="chat-widget__send-btn" disabled={sending}>
                  Gửi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
