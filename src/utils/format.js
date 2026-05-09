export const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

export const fullName = (c) =>
  [c?.nombre, c?.apellido_paterno, c?.apellido_materno].filter(Boolean).join(' ');
