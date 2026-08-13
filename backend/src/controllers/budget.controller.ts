/**
 * @fileoverview 预算控制器，处理月度预算设定、查询、进度与删除
 * @module controllers/budget.controller
 *
 * @example 请求 GET /api/v1/budgets/progress?month=2026-09
 * Header: x-user-id: uuid
 * @example 成功响应（目标页进度环用 overview，分类条用 categories）
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": {
 *     "month": "2026-09",
 *     "overview": {
 *       "total_budget": 250000,
 *       "total_budget_yuan": "2500.00",
 *       "total_spent": 80450,
 *       "total_spent_yuan": "804.50",
 *       "total_remaining": 169550,
 *       "total_remaining_yuan": "1695.50",
 *       "progress_percentage": 32.2,
 *       "status": "normal"
 *     },
 *     "categories": [
 *       {
 *         "category_name": "餐饮",
 *         "percentage": 16.2,
 *         "status": "normal"
 *       }
 *     ]
 *   }
 * }
 */

import { NextFunction, Request, Response } from 'express';
import {
  deleteBudgetSchema,
  queryBudgetSchema,
  setBudgetSchema,
} from '../schemas/budget.schema';
import { budgetService } from '../services/budget.service';
import {
  BudgetListResult,
  BudgetView,
  MonthlyBudgetProgress,
} from '../types/budget.types';
import { ApiSuccessResponse, UserRecord } from '../types/user.types';
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
 * 设置或更新月度预算
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function setBudget(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const payload = setBudgetSchema.parse(req.body);
    const data = await budgetService.setBudget(
      user.id,
      payload.category_id,
      payload.month,
      payload.limit_amount,
    );
    const body: ApiSuccessResponse<BudgetView> = {
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
 * 查询某月所有分类预算
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function listBudgets(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const query = queryBudgetSchema.parse(req.query);
    const data = await budgetService.getUserBudgets(user.id, query.month);
    const body: ApiSuccessResponse<BudgetListResult> = {
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
 * 查询月度预算进度（总览 + 分类）
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function getBudgetProgress(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const query = queryBudgetSchema.parse(req.query);
    const data = await budgetService.getMonthProgress(user.id, query.month);
    const body: ApiSuccessResponse<MonthlyBudgetProgress> = {
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
 * 删除某分类月度预算
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function deleteBudget(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const query = deleteBudgetSchema.parse(req.query);
    await budgetService.deleteBudget(user.id, query.category_id, query.month);
    const body: ApiSuccessResponse<null> = {
      code: 0,
      message: 'success',
      data: null,
    };
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
}
