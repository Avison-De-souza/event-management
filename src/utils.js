export const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60';

export const onPosterError = (e) => {
  if (e.currentTarget.src !== FALLBACK_POSTER) e.currentTarget.src = FALLBACK_POSTER;
};

// Parses 'YYYY-MM-DD' as a local date (avoids the UTC off-by-one bug of new Date('2026-12-05')).
export const parseDate = (value) => {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export const formatDate = (value) => {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};

export const startOfToday = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

export const daysUntil = (value) => {
  const d = parseDate(value);
  return d ? Math.round((d - startOfToday()) / 86400000) : null;
};

export const hasEnded = (event) => {
  const d = daysUntil(event.event_date);
  return d !== null && d < 0;
};

// Single source of truth for how an event's registration window is described.
export const registrationState = (event) => {
  if (hasEnded(event)) return { key: 'ended', label: 'Event ended', tone: '' };
  const left = daysUntil(event.deadline_date);
  if (left !== null && left < 0) return { key: 'closed', label: 'Registration closed', tone: '' };
  if (left === 0) return { key: 'soon', label: 'Closes today', tone: 'warn' };
  if (left !== null && left <= 3) return { key: 'soon', label: `Closes in ${left} day${left === 1 ? '' : 's'}`, tone: 'warn' };
  return { key: 'open', label: 'Open for registration', tone: 'ok' };
};

export const isOpen = (event) => ['open', 'soon'].includes(registrationState(event).key);

// Escapes quotes and neutralises spreadsheet formulas (=, +, -, @) in user-entered text.
const csvCell = (value) => {
  let s = String(value ?? '');
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export const downloadCSV = (filename, header, rows) => {
  const body = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
