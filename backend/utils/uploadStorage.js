import fs from 'fs';
import path from 'path';
import { buildPublicUploadUrl, extractLocalUploadRelativePath, isHttpUrl } from './publicUrl.js';

export const getUploadProvider = () => 'local';

export const isCloudinaryUploadUrl = (value) => /res\.cloudinary\.com|cloudinary\.com/i.test(String(value || ''));

export const uploadImageFile = async ({ req, file, localRelativeDir = 'uploads/products' }) => {
  if (!file) throw new Error('No file provided');

  const rel = path.posix.join(localRelativeDir.replace(/\\/g, '/'), path.basename(file.path));
  return {
    provider: 'local',
    url: buildPublicUploadUrl(req, rel),
    path: rel,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
};

export const uploadReceiptFile = async ({ file, localRelativeDir = 'uploads/receipts' }) => {
  if (!file) throw new Error('No file provided');

  const rel = path.posix.join(localRelativeDir.replace(/\\/g, '/'), path.basename(file.path));
  return {
    provider: 'local',
    url: rel, // store relative local path for receipts
    path: rel,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
};

export const resolveLocalAbsolutePathFromStored = (storedPathOrUrl) => {
  const rel = extractLocalUploadRelativePath(storedPathOrUrl);
  if (!rel) return null;
  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  const resolved = path.resolve(process.cwd(), rel);
  if (!resolved.startsWith(uploadsRoot)) return null;
  return resolved;
};

// Compatibility stub (Cloudinary removed; local/public URLs still work)
export const buildCloudinaryDeliveryUrl = (stored) => {
  if (!stored) return '';
  const value = typeof stored === 'string' ? stored : (stored.filePath || stored.url || '');
  if (!value) return '';
  return isHttpUrl(value) ? value : '';
};

export const removeStoredUpload = async (storedPathOrUrl, meta = {}) => {
  const value = storedPathOrUrl || meta?.filePath || meta?.url;
  if (!value) return;

  const abs = resolveLocalAbsolutePathFromStored(value);
  if (abs && fs.existsSync(abs)) {
    try { fs.unlinkSync(abs); } catch {}
  }
};
