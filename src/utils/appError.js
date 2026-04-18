export class AppError extends Error {
  constructor(message, statusCode = 500, payload) {
    super(message);
    this.statusCode = statusCode;
    this.payload = payload;
  }
}
