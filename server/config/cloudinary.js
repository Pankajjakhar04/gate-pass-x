const { v2: cloudinary } = require('cloudinary');

function getCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary environment variables are required for photo uploads');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  return cloudinary;
}

function privatePhotoUrl(key, expiresInSeconds = 300) {
  if (!key) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const options = {
    type: 'authenticated',
    resource_type: 'image',
    secure: true,
    sign_url: true,
    expires_at: expiresAt
  };
  if (!key.includes('.')) {
    options.format = 'jpg';
  }
  return getCloudinary().url(key, options);
}

module.exports = { getCloudinary, privatePhotoUrl };