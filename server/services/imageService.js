const sharp = require('sharp');
const { getCloudinary } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

async function preparePhoto(buffer) {
  const metadata = await sharp(buffer).metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('Unsupported image format');
  if (!metadata.width || !metadata.height || metadata.width < 300 || metadata.height < 300 || metadata.width > 4000 || metadata.height > 4000) {
    throw new Error('Photo dimensions must be between 300 and 4000 pixels');
  }
  return sharp(buffer).rotate().resize(600, 800, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer();
}

async function uploadPhoto(buffer, folder) {
  let normalized;
  try {
    normalized = await preparePhoto(buffer);
  } catch (error) {
    throw new ApiError(422, 'PHOTO_INVALID', error.message || 'Photo could not be validated');
  }

  let cloudinary;
  try {
    cloudinary = getCloudinary();
  } catch (error) {
    throw new ApiError(502, 'PHOTO_STORAGE_UNAVAILABLE', 'Photo storage is not configured');
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        type: 'authenticated',
        access_mode: 'authenticated',
        resource_type: 'image',
        format: 'jpg'
      },
      (error, result) => {
        if (error) {
          if (process.env.NODE_ENV !== 'production') console.error('Cloudinary upload failed:', { message: error.message, httpCode: error.http_code, name: error.name });
          return reject(new ApiError(502, 'PHOTO_STORAGE_ERROR', 'Photo storage rejected the upload'));
        }
        return resolve({ key: result.public_id, url: result.secure_url });
      }
    );
    stream.on('error', () => reject(new ApiError(502, 'PHOTO_STORAGE_ERROR', 'Photo storage rejected the upload')));
    stream.end(normalized);
  });
}

module.exports = { preparePhoto, uploadPhoto };