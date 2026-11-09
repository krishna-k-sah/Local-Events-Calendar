export const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error.errors) {
        const validationErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        const summary = validationErrors
          .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
          .join(', ');
        return res.status(400).json({
          success: false,
          message: `Validation failed for request payload. ${summary}`,
          errors: validationErrors,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid request data.',
        error: error.message,
      });
    }
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error.errors) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters.',
          errors: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      return res.status(400).json({ success: false, message: 'Invalid query data.' });
    }
  };
};
