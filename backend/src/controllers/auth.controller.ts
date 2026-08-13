/**
 * @fileoverview 认证控制器，处理登录请求与响应
 * @module controllers/auth.controller
 *
 * @example 请求 POST /api/v1/auth/login
 * {
 *   "phone": "13800138000",
 *   "code": "123456"
 * }
 * @example 成功响应
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": {
 *     "user": { "id": "uuid", "phone": "13800138000", "personality": "gentle", "created_at": "..." },
 *     "is_new_user": true
 *   }
 * }
 */

import { NextFunction, Request, Response } from 'express';
import { loginSchema } from '../schemas/auth.schema';
import { authService } from '../services/auth.service';
import { ApiSuccessResponse, LoginResult } from '../types/user.types';

/**
 * 手机号验证码登录
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payload = loginSchema.parse(req.body);
    const data = await authService.login(payload.phone, payload.code);
    const body: ApiSuccessResponse<LoginResult> = {
      code: 0,
      message: 'success',
      data,
    };
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
}
