/**
 * @fileoverview 全局错误处理中间件，统一 API 错误响应且不记录敏感信息
 * @module middlewares/error.middleware
 */

import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import { ApiErrorResponse } from '../types/user.types';

/**
 * Express 错误处理中间件
 *
 * @param error - 捕获到的异常
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 下一个中间件
 * @returns void
 */
export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SyntaxError) {
    logger.error('Request JSON parse failed', {
      method: req.method,
      path: req.path,
    });
    const invalidJsonBody: ApiErrorResponse = {
      code: 40001,
      message: '请求体不是合法 JSON',
      data: null,
    };
    res.status(400).json(invalidJsonBody);
    return;
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const message = firstIssue?.message ?? '请求参数不正确';
    logger.error('Request validation failed', {
      method: req.method,
      path: req.path,
    });
    const body: ApiErrorResponse = {
      code: 40001,
      message,
      data: null,
    };
    res.status(400).json(body);
    return;
  }

  if (error instanceof AppError) {
    logger.error('Request failed', {
      method: req.method,
      path: req.path,
      code: error.code,
      error: error.message,
    });
    const body: ApiErrorResponse = {
      code: error.code,
      message: error.message,
      data: null,
    };
    res.status(error.httpStatus).json(body);
    return;
  }

  logger.error('Unhandled request error', {
    method: req.method,
    path: req.path,
    error,
  });
  const body: ApiErrorResponse = {
    code: 50000,
    message: '服务器内部错误',
    data: null,
  };
  res.status(500).json(body);
}
