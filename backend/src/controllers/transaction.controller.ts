/**
 * @fileoverview 账目控制器，处理交易的增删改查与月度汇总
 * @module controllers/transaction.controller
 *
 * @example 请求 POST /api/v1/transactions
 * Header: x-user-id: uuid
 * {
 *   "amount": 2500,
 *   "category_name": "餐饮",
 *   "note": "中午吃面",
 *   "recorded_at": "2026-08-13T12:30:00Z"
 * }
 * @example 成功响应
 * {
 *   "code": 0,
 *   "message": "success",
 *   "data": {
 *     "id": "uuid",
 *     "amount": 2500,
 *     "amount_yuan": "25.00",
 *     "category_name": "餐饮",
 *     "source": "voice",
 *     "is_confirmed": true
 *   }
 * }
 */

import { NextFunction, Request, Response } from 'express';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  monthlySummaryQuerySchema,
  transactionIdParamSchema,
  updateTransactionSchema,
} from '../schemas/transaction.schema';
import { transactionService } from '../services/transaction.service';
import { ApiSuccessResponse, UserRecord } from '../types/user.types';
import { MonthlySummary, TransactionView } from '../types/transaction.types';
import { TransactionListResult } from '../services/transaction.service';
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
 * 创建交易
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function createTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const payload = createTransactionSchema.parse(req.body);
    const data = await transactionService.createTransaction(user.id, payload);
    const body: ApiSuccessResponse<TransactionView> = {
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
 * 查询交易列表
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function listTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const query = listTransactionsQuerySchema.parse(req.query);
    const data = await transactionService.getUserTransactions(user.id, {
      month: query.month,
      categoryId: query.category_id,
      limit: query.limit,
      offset: query.offset,
    });
    const body: ApiSuccessResponse<TransactionListResult> = {
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
 * 查询单笔交易
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function getTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const params = transactionIdParamSchema.parse(req.params);
    const data = await transactionService.getTransaction(user.id, params.id);
    const body: ApiSuccessResponse<TransactionView> = {
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
 * 更新交易
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function updateTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const params = transactionIdParamSchema.parse(req.params);
    const payload = updateTransactionSchema.parse(req.body);
    const data = await transactionService.updateTransaction(user.id, params.id, payload);
    const body: ApiSuccessResponse<TransactionView> = {
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
 * 删除交易
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function deleteTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const params = transactionIdParamSchema.parse(req.params);
    await transactionService.deleteTransaction(user.id, params.id);
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

/**
 * 月度汇总
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function getMonthlySummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const query = monthlySummaryQuerySchema.parse(req.query);
    const data = await transactionService.getMonthlySummary(user.id, query.month);
    const body: ApiSuccessResponse<MonthlySummary> = {
      code: 0,
      message: 'success',
      data,
    };
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
}
