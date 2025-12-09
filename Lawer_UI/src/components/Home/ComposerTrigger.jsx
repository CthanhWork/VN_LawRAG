import { EmojiIcon, ImageIcon } from './BentoIcons';
import AvatarBadge from './AvatarBadge';
import './HomeShared.css';

const ComposerTrigger = ({ firstLetter, avatarUrl, displayName, onOpen }) => (
  <div className="home-feed__composer page-card">
    <AvatarBadge src={avatarUrl} fallback={firstLetter} title={displayName} />
    <button type="button" className="home-feed__open-modal" onClick={onOpen}>
      Viết gì đó cho cộng đồng...
    </button>
    <div className="home-feed__composer-actions">
      <span className="home-icon-button" aria-hidden="true">
        <ImageIcon size={18} />
      </span>
      <span className="home-icon-button" aria-hidden="true">
        <EmojiIcon size={18} />
      </span>
    </div>
  </div>
);

export default ComposerTrigger;
