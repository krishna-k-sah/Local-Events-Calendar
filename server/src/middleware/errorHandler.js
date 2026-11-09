import multer from 'multer';

export const errorHandler = (err, req, res, next) => {
  // Handle Multer-specific upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum allowable limit of 5 MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  // Handle custom upload errors
  if (
    err.message &&
    (err.message.startsWith('INVALID_FILE_TYPE') ||
      err.message.startsWith('INVALID_MIME_TYPE') ||
      err.message.startsWith('MALICIOUS_SVG_REJECTED'))
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Log non-test errors
  if (process.env.NODE_ENV !== 'test') {
    console.error('🔥 Server Error:', err);
  }

  const statusCode = err.statusCode || (res.statusCode !== 200 && res.statusCode !== 201 ? res.statusCode : 500);

  // In production, sanitize 500-level error messages to prevent internal credential/schema leakage
  const safeMessage = (statusCode >= 500 && process.env.NODE_ENV === 'production')
    ? 'An unexpected internal server error occurred.'
    : (err.message || 'Internal Server Error');

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
