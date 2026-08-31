export class WanxiangRuntimeError extends Error {
  constructor(code, message, details = '') {
    super(message);
    this.name = 'WanxiangRuntimeError';
    this.code = code;
    this.details = details;
  }
}
