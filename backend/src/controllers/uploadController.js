import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const ALLOWED_FOLDERS = new Set(['avatars', 'resumes', 'portfolio', 'certifications', 'attachments']);

function streamUpload(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `skillsphere/${folder}`, resource_type: 'auto' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

export const uploadFile = asyncHandler(async (req, res) => {
  if (!isCloudinaryConfigured) {
    throw new ApiError(501, 'File uploads are not configured on this server — set CLOUDINARY_* env vars, or paste a URL directly into the profile field instead.');
  }
  if (!req.file) throw new ApiError(400, 'No file uploaded');

  const folder = ALLOWED_FOLDERS.has(req.body.folder) ? req.body.folder : 'attachments';
  const result = await streamUpload(req.file.buffer, folder);

  res.status(201).json(
    new ApiResponse(201, { url: result.secure_url, publicId: result.public_id, folder }, 'File uploaded')
  );
});
