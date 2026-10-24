const multer = require('multer');

function createUpload(fileCount = 1) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: fileCount },
    fileFilter: (_req, file, callback) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return callback(new Error('Only JPEG, PNG, and WebP images are accepted'));
      return callback(null, true);
    }
  });
}

const upload = createUpload();
upload.create = createUpload;

module.exports = upload;