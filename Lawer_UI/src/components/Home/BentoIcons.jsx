import React from 'react';

const IconBase = ({ children, size = 22, className = '', strokeWidth = 1.6, ...rest }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    {children}
  </svg>
);

export const HeartIcon = ({ active = false, ...rest }) => (
  <IconBase
    {...rest}
    fill={active ? 'currentColor' : 'none'}
    strokeWidth={active ? 1.3 : 1.6}
  >
    <path d="M12 20.7s-6.2-4.4-8.4-7.8C2 10 2.4 6.4 5 4.7 7 3.4 9.6 3.9 11 5.8c1.4-1.9 4-2.4 6-1.1 2.6 1.7 3 5.3 1.4 8.2-2.2 3.4-8.4 7.8-8.4 7.8Z" />
  </IconBase>
);

export const CommentIcon = (props) => (
  <IconBase {...props}>
    <path d="M4.5 5.5h15A2.5 2.5 0 0 1 22 8v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3v-3H4.5A2.5 2.5 0 0 1 2 15V8a2.5 2.5 0 0 1 2.5-2.5Z" />
  </IconBase>
);

export const ShareIcon = (props) => (
  <IconBase {...props}>
    <circle cx="18" cy="6" r="2.4" />
    <circle cx="6" cy="12.5" r="2.4" />
    <circle cx="15" cy="18" r="2.4" />
    <path d="M7.9 13.4 15.2 8.5" />
    <path d="M7.8 11.5 14.1 16" />
  </IconBase>
);

export const BookmarkIcon = ({ active = false, ...rest }) => (
  <IconBase {...rest} fill={active ? 'currentColor' : 'none'}>
    <path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v15l-6.5-3.2L5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
  </IconBase>
);

export const ImageIcon = (props) => (
  <IconBase {...props}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <circle cx="9" cy="11" r="1.8" />
    <path d="M3 16.5 9 11l5 4 3.5-3 3.5 3" />
  </IconBase>
);

export const EmojiIcon = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="8" />
    <path d="M9 10.5h0.01M15 10.5h0.01" />
    <path d="M8.5 14.5c.6.9 1.8 1.5 3.5 1.5s2.9-.6 3.5-1.5" />
  </IconBase>
);

export const GifIcon = (props) => (
  <IconBase {...props}>
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <path d="M8.5 14.5a2 2 0 1 1 0-3.9h1.4" />
    <path d="M10 12.5H8.7" />
    <path d="M12.3 10.6v4" />
    <path d="M16 10.6h-2.4v4H16" />
  </IconBase>
);

export const TagIcon = (props) => (
  <IconBase {...props}>
    <path d="M4.5 5.5h7.2l7.8 7.8a2.2 2.2 0 0 1 0 3.1l-3.5 3.5a2.2 2.2 0 0 1-3.1 0L4.5 12.1V5.5Z" />
    <circle cx="9.3" cy="9.3" r="1.2" />
  </IconBase>
);

export const CloseIcon = (props) => (
  <IconBase {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </IconBase>
);

export const SendIcon = (props) => (
  <IconBase {...props}>
    <path d="M4 4.5 20 12 4 19.5l3.2-7.1L4 4.5Z" />
    <path d="M20 12 7.2 12.4" />
  </IconBase>
);

export const MoreIcon = (props) => (
  <IconBase {...props} strokeWidth={2}>
    <circle cx="5" cy="12" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="19" cy="12" r="1.4" />
  </IconBase>
);

export const GlobeIcon = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4v16" />
    <path d="M6 9.5h12" />
    <path d="M6 14.5h12" />
    <path d="M9.5 4.5c-.9 1.8-1.3 3.9-1.3 6.3 0 2.4.4 4.5 1.3 6.3" />
    <path d="M14.5 4.5c.9 1.8 1.3 3.9 1.3 6.3 0 2.4-.4 4.5-1.3 6.3" />
  </IconBase>
);

export default {
  HeartIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  ImageIcon,
  EmojiIcon,
  GifIcon,
  TagIcon,
  CloseIcon,
  SendIcon,
  MoreIcon,
  GlobeIcon,
};
