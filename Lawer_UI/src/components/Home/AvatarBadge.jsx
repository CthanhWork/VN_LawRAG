import './HomeShared.css';

const AvatarBadge = ({ src, fallback, size = 'default', title }) => {
  const classes = ['bento-avatar'];
  if (size === 'small') classes.push('bento-avatar--small');
  if (src) classes.push('bento-avatar--image');

  return (
    <div className={classes.join(' ')} title={title || undefined}>
      {src ? <img src={src} alt={title || 'Avatar'} loading="lazy" /> : fallback}
    </div>
  );
};

export default AvatarBadge;
