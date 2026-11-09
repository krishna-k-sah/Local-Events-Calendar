import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Strict whitelist of allowed extensions and corresponding mime types
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `poster-${uniqueSuffix}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Explicitly reject SVGs or executables
  if (ext === '.svg' || file.mimetype === 'image/svg+xml') {
    return cb(new Error('MALICIOUS_SVG_REJECTED: Scalable Vector Graphics (SVG) are forbidden for security reasons.'), false);
  }

  // 1. Verify extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('INVALID_FILE_TYPE: Only .jpg, .jpeg, .png, .webp, and .gif extensions are permitted.'), false);
  }

  // 2. Verify MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('INVALID_MIME_TYPE: File MIME type does not match an allowed image format.'), false);
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
    files: 1, // Only 1 file per upload request
  },
  fileFilter,
});

/**
 * Deep inspection of file magic bytes to prevent MIME-type spoofing
 * (e.g. executable/script files disguised as .png or .jpg).
 */
export const validateImageMagicBytes = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const filePath = req.file.path;
  try {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isGif = buffer.toString('ascii', 0, 4) === 'GIF8';
    const isWebp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';

    if (!isJpeg && !isPng && !isGif && !isWebp) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({
        success: false,
        message: 'MAGIC_BYTE_MISMATCH: File binary signature does not match a genuine JPEG, PNG, GIF, or WebP image.',
      });
    }

    next();
  } catch (err) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res.status(400).json({
      success: false,
      message: 'Failed to verify image binary content.',
    });
  }
};
