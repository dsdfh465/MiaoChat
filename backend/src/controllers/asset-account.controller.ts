/**
 * @fileoverview 资产账户控制器
 * @module controllers/asset-account.controller
 *
 * @example POST /api/v1/asset-accounts
 * Header: x-user-id: uuid
 */

import { NextFunction, Request, Response } from 'express';
import {
  assetAccountDetailQuerySchema,
  createAssetAccountSchema,
  createCreditBillSchema,
  listAssetAccountsSchema,
  recordAssetTransactionSchema,
  repayCreditBillSchema,
} from '../schemas/asset-account.schema';
import { assetAccountService } from '../services/asset-account.service';
import {
  AssetAccountDetailResult,
  AssetAccountListResult,
  AssetAccountView,
  AssetTransactionView,
  CreditCardBillView,
} from '../types/asset-account.types';
import { ApiSuccessResponse, UserRecord } from '../types/user.types';
import { AppError } from '../utils/app-error';

/**
 * 取出已鉴权用户
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
 * 创建资产账户
 */
export async function createAssetAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const payload = createAssetAccountSchema.parse(req.body);
    const data = await assetAccountService.createAccount(user.id, payload);
    const body: ApiSuccessResponse<AssetAccountView> = {
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
 * 查询账户列表与总资产
 */
export async function listAssetAccounts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const query = listAssetAccountsSchema.parse(req.query);
    const data = await assetAccountService.getUserAccounts(
      user.id,
      query.include_inactive ?? false,
    );
    const body: ApiSuccessResponse<AssetAccountListResult> = {
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
 * 查询单个账户详情（含流水）
 */
export async function getAssetAccountDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const accountId = String(req.params.accountId ?? '');
    const query = assetAccountDetailQuerySchema.parse(req.query);
    const data = await assetAccountService.getAccountDetail(
      user.id,
      accountId,
      query.limit,
      query.offset,
    );
    const body: ApiSuccessResponse<AssetAccountDetailResult> = {
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
 * 记录账户变动
 */
export async function recordAssetTransaction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const accountId = String(req.params.accountId ?? '');
    const payload = recordAssetTransactionSchema.parse(req.body);
    const data = await assetAccountService.recordTransaction(user.id, accountId, payload);
    const body: ApiSuccessResponse<{
      account: AssetAccountView;
      transaction: AssetTransactionView;
    }> = {
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
 * 逻辑删除账户
 */
export async function deleteAssetAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const accountId = String(req.params.accountId ?? '');
    await assetAccountService.deleteAccount(user.id, accountId);
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
 * 创建信用卡账单
 */
export async function createCreditBill(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const accountId = String(req.params.accountId ?? '');
    const payload = createCreditBillSchema.parse(req.body);
    const billMonth =
      payload.bill_month.length === 7 ? `${payload.bill_month}-01` : payload.bill_month;
    const data = await assetAccountService.createCreditBill(
      user.id,
      accountId,
      billMonth,
      payload.total_amount,
      payload.due_date,
    );
    const body: ApiSuccessResponse<CreditCardBillView> = {
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
 * 查询信用卡账单列表
 */
export async function listCreditBills(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const accountId = String(req.params.accountId ?? '');
    const data = await assetAccountService.listCreditBills(user.id, accountId);
    const body: ApiSuccessResponse<CreditCardBillView[]> = {
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
 * 信用卡账单还款
 */
export async function repayCreditBill(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const billId = String(req.params.billId ?? '');
    const payload = repayCreditBillSchema.parse(req.body);
    const data = await assetAccountService.repayCreditBill(user.id, billId, payload.amount);
    const body: ApiSuccessResponse<CreditCardBillView> = {
      code: 0,
      message: 'success',
      data,
    };
    res.status(200).json(body);
  } catch (error) {
    next(error);
  }
}
