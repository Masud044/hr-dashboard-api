export function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const payload = error.payload || {
    success: false,
    message: error.message || "Internal server error"
  };

  if (res.headersSent) {
    return next(error);
  }

  res.status(statusCode).json(payload);
}
