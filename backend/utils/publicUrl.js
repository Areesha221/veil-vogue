const trimTrailingSlash = (s = '') => String(s).replace(/\/+$/, '');

export const getBackendBaseUrl = (req) => {
  const envBase =
    process.env.PUBLIC_BASE_URL ||
    process.env.BACKEND_URL ||
    process.env.API_BASE_URL ||
    '';
  if (envBase) return trimTrailingSlash(envBase);

  if (req) {
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim();
    const host = req.get ? req.get('host') : req.headers?.host;
    if (host) return `${proto}://${host}`;
  }

  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
};

export const buildPublicUploadUrl = (req, relativePath) => {
  if (!relativePath) return '';
  const rel = String(relativePath).replace(/\\/g, '/').replace(/^\/+/, '');
  if (/^https?:\/\//i.test(rel)) return rel;
  return `${getBackendBaseUrl(req)}/${rel}`;
};

export const extractLocalUploadRelativePath = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const p = decodeURIComponent(url.pathname || '').replace(/^\/+/, '');
      return p.startsWith('uploads/') ? p : '';
    } catch {
      return '';
    }
  }
  return raw.replace(/\\/g, '/').replace(/^\/+/, '');
};

export const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());
