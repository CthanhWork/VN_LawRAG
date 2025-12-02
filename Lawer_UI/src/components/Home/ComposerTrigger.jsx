import { EmojiIcon, ImageIcon } from './BentoIcons';
import './HomeShared.css';

const ComposerTrigger = ({ firstLetter, onOpen }) => (
  <div className="home-feed__composer page-card">
    <div className="bento-avatar">{firstLetter}</div>
    <button type="button" className="home-feed__open-modal" onClick={onOpen}>
      Viết gì đó cho cộng đồng...
    </button>
    <div className="home-feed__composer-actions">
      <span className="home-icon-button" aria-hidden="true">
        <ImageIcon size={20} />
      </span>
      <span className="home-icon-button" aria-hidden="true">
        <EmojiIcon size={20} />
      </span>
    </div>
  </div>
);

export default ComposerTrigger;
