/**
 * @fileoverview 用户画像控制器，处理当前用户信息查询与人格更新
 * @module controllers/user.controller
 *
 * @example 请求 GET /api/v1/users/me
 * Header: x-user-id: uuid
 * @example 成功响应
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": {
 *     "id": "uuid",
 *     "phone": "13800138000",
 *     "personality": "gentle",
 *     "created_at": "2026-08-13T08:00:00Z"
 *   }
 * }
 */

import { NextFunction, Request, Response } from 'express';
import { updatePersonalitySchema } from '../schemas/user.schema';
import { userService } from '../services/user.service';
import {
  ApiSuccessResponse,
  UserPersonalityView,
  UserProfile,
  UserRecord,
} from '../types/user.types';
import { AppError } from '../utils/app-error';

/**
 * 从请求中取出已鉴权用户
 *
 * @param req - Express 请求
 * @returns 当前用户
 */
function requireUser(req: Request): UserRecord {
  if (!req.user) {
    throw new AppError(40101, '未提供用户标识', 401);
  }
  return req.user;
}

/**
 * 获取当前用户信息
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const data = await userService.getUserProfile(user.id);
    const body: ApiSuccessResponse<UserProfile> = {
      code: 0,
      message: 'success',
      data,
    };
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
}

/**
 * 更新当前用户人格
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function updatePersonality(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = updatePersonalitySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(40003, '人格值无效，允许值：strict, gentle, buddha', 400);
    }
    const data = await userService.updatePersonality(user.id, parsed.data.personality);
    const body: ApiSuccessResponse<UserPersonalityView> = {
      code: 0,
      message: 'success',
      data,
    };
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
}
