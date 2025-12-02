export const formatDate = (value) => {
  if (!value) return '--';
  try {
    return new Date(value).toLocaleString('vi-VN', { hour12: false });
  } catch {
    return String(value);
  }
};

export const parseRoles = (roles) =>
  (roles || '')
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);

export const pickError = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

export const truncate = (text, max = 90) => {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
};
