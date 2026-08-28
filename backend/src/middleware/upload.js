import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);
const MAX_FILE_SIZE_MB = 8;

const storage = multer.memoryStorage(); // buffer in memory, streamed to Cloudinary by the controller

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new ApiError(415, `Unsupported file type: ${file.mimetype}. Allowed: images or PDF.`));
    }
    cb(null, true);
  },
});
