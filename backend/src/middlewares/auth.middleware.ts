/**
 * @fileoverview MVP 简易鉴权：从 Header x-user-id 读取用户并校验存在性
 * @module middlewares/auth.middleware
 */

import { NextFunction, Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/app-error';

/**
 * 读取请求头中的用户 ID，校验用户存在后挂到 req.user
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 下一中间件
 * @returns Promise<void>
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawHeader = req.headers['x-user-id'];
    const userId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (!userId || userId.trim().length === 0) {
      throw new AppError(40101, '未提供用户标识', 401);
    }

    const user = await userRepository.findById(userId.trim());
    if (!user) {
      throw new AppError(40102, '用户不存在', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
