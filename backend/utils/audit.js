import AuditLog from '../models/AuditLog.js';

const clean = (value, max = 500) => {
  if (value == null) return '';
  const s = String(value).trim();
  return s.length > max ? s.slice(0, max) : s;
};

const safeJsonValue = (value, depth = 0) => {
  if (value == null) return value;
  if (depth > 4) return '[MaxDepth]';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => safeJsonValue(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    const entries = Object.entries(value).slice(0, 50);
    for (const [k, v] of entries) {
      if (/password|token|secret|authorization|cookie/i.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = safeJsonValue(v, depth + 1);
      }
    }
    return out;
  }
  try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
};

export const logAudit = async (req, payload = {}) => {
  try {
    const actor = req?.user || null;
    await AuditLog.create({
      actor: actor?._id || null,
      actorName: clean(actor?.name || payload.actorName || ''),
      actorEmail: clean(actor?.email || payload.actorEmail || ''),
      actorRole: clean(actor?.role || payload.actorRole || ''),
      action: clean(payload.action || 'unknown_action', 120),
      entityType: clean(payload.entityType || 'unknown', 120),
      entityId: clean(payload.entityId || '', 120),
      entityLabel: clean(payload.entityLabel || '', 200),
      summary: clean(payload.summary || '', 1000),
      before: safeJsonValue(payload.before),
      after: safeJsonValue(payload.after),
      metadata: safeJsonValue(payload.metadata),
      ip: clean(req?.ip || req?.headers?.['x-forwarded-for'] || '', 200),
      userAgent: clean(req?.headers?.['user-agent'] || '', 300)
    });
  } catch (error) {
    console.error('Audit log error:', error?.message || error);
  }
};

export const pickAuditFields = (obj, fields = []) => {
  if (!obj || typeof obj !== 'object') return null;
  const src = typeof obj.toObject === 'function' ? obj.toObject() : obj;
  const out = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(src, field)) {
      out[field] = src[field];
    }
  }
  return out;
};
