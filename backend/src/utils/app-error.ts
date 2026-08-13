/**
 * @fileoverview 应用错误类型，供控制器与全局错误中间件使用
 * @module utils/app-error
 */

export class AppError extends Error {
  readonly code: number;
  readonly httpStatus: number;

  /**
   * 创建业务错误
   *
   * @param code - 业务错误码，0 表示成功
   * @param message - 可返回给客户端的错误说明
   * @param httpStatus - HTTP 状态码
   */
  constructor(code: number, message: string, httpStatus: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
