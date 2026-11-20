import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { buildPublicUploadUrl, extractLocalUploadRelativePath, isHttpUrl } from './publicUrl.js';

let cloudinaryConfigured = false;

const ensureCloudinary = () => {
  if (cloudinaryConfigured) return true;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return false;
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  cloudinaryConfigured = true;
  return true;
};

export const getUploadProvider = () => {
  const requested = String(process.env.UPLOAD_PROVIDER || 'local').toLowerCase();
  if (requested === 'cloudinary' && ensureCloudinary()) return 'cloudinary';
  return 'local';
};

export const isCloudinaryUploadUrl = (value) => /res\.cloudinary\.com|cloudinary\.com/i.test(String(value || ''));

export const uploadImageFile = async ({ req, file, folder = 'veil-and-vogue/products', localRelativeDir = 'uploads/products' }) => {
  if (!file) throw new Error('No file provided');

  if (getUploadProvider() === 'cloudinary') {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'image',
      use_filename: true,
      unique_filename: true,
      overwrite: false
    });
    // Clean up local temp file created by multer
    try { fs.unlinkSync(file.path); } catch {}
    return {
      provider: 'cloudinary',
      url: result.secure_url || result.url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    };
  }

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

export const uploadReceiptFile = async ({ req, file, folder = 'veil-and-vogue/receipts', localRelativeDir = 'uploads/receipts' }) => {
  if (!file) throw new Error('No file provided');

  if (getUploadProvider() === 'cloudinary') {
    // Use authenticated delivery type for better privacy; we still serve via authorized backend endpoint/proxy.
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'auto',
      type: 'authenticated',
      use_filename: true,
      unique_filename: true,
      overwrite: false
    });
    try { fs.unlinkSync(file.path); } catch {}
    return {
      provider: 'cloudinary',
      url: result.secure_url || result.url,
      publicId: result.public_id,
      resourceType: result.resource_type || 'raw',
      deliveryType: result.type || 'authenticated',
      format: result.format,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    };
  }

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

export const buildCloudinaryDeliveryUrl = (stored, options = {}) => {
  if (!stored) return '';
  const value = typeof stored === 'string' ? stored : (stored.filePath || stored.url || '');
  if (!value) return '';
  if (isHttpUrl(value) && !isCloudinaryUploadUrl(value)) return value;

  // If we have a public URL, return as-is (useful for non-authenticated assets)
  if (isHttpUrl(value) && typeof stored === 'string') return value;
  if (stored?.publicId && ensureCloudinary()) {
    try {
      return cloudinary.url(stored.publicId, {
        secure: true,
        resource_type: stored.resourceType || 'image',
        type: stored.deliveryType || 'upload',
        sign_url: (stored.deliveryType || '').includes('authenticated'),
        ...options
      });
    } catch {
      return isHttpUrl(value) ? value : '';
    }
  }
  return isHttpUrl(value) ? value : '';
};

export const removeStoredUpload = async (storedPathOrUrl, meta = {}) => {
  const value = storedPathOrUrl || meta?.filePath || meta?.url;
  if (!value) return;
  if (meta?.provider === 'cloudinary' && meta?.publicId && ensureCloudinary()) {
    try {
      await cloudinary.uploader.destroy(meta.publicId, {
        resource_type: meta.resourceType || 'image',
        type: meta.deliveryType || 'upload',
        invalidate: true
      });
      return;
    } catch (error) {
      console.error('Cloudinary delete error:', error?.message || error);
    }
  }
  const abs = resolveLocalAbsolutePathFromStored(value);
  if (abs && fs.existsSync(abs)) {
    try { fs.unlinkSync(abs); } catch {}
  }
};
