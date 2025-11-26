import './HomeShared.css';

const ComposerTrigger = ({ firstLetter, onOpen }) => (
  <div className="home-feed__composer page-card">
    <div className="home-feed__composer-avatar">{firstLetter}</div>
    <button className="home-feed__open-modal" onClick={onOpen}>
      Viết bài mới
    </button>
  </div>
);

export default ComposerTrigger;
