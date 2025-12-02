import { useState } from 'react';
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

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    // Stubbed reply; real integration can call RAG/chat API here.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Mình đã ghi nhận câu hỏi. Muốn tra cứu chuyên sâu, bật chế độ RAG trong cài đặt sắp ra mắt.',
        },
      ]);
      setSending(false);
    }, 400);
  };

  return (
    <div className="chat-widget page-card">
      <div className="chat-widget__head">
        <div className="chat-widget__heading">
          <span className="chat-widget__icon" role="img" aria-label="law">
            ⚖️
          </span>
          <div>
            <h3 className="chat-widget__title">Trợ lý Pháp lý VN</h3>
            <p className="chat-widget__subtitle">Hỏi đáp pháp luật, nhận gợi ý nhanh.</p>
          </div>
        </div>
        <div className="chat-widget__actions">
          <button type="button" className="chat-widget__icon-btn" aria-label="Lịch sử chat">
            🕑
          </button>
          <button type="button" className="chat-widget__icon-btn" aria-label="Cài đặt">
            ⚙️
          </button>
        </div>
      </div>

      <div className="chat-widget__body">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-widget__bubble chat-widget__bubble--${msg.role}`}>
            {msg.text}
          </div>
        ))}
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
      </div>

      <form className="chat-widget__form" onSubmit={handleSend}>
        <div className="chat-widget__input-wrap chat-widget__input-wrap--plain">
          <input
            type="text"
            placeholder="Nhập câu hỏi pháp luật của bạn..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="chat-widget__send-btn" disabled={sending}>
            ➤
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWidget;
