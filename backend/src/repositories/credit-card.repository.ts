/**
 * @fileoverview 信用卡账单数据访问层
 * @module repositories/credit-card.repository
 */

import { getSupabaseClient } from '../config/database';
import {
  CreditBillStatus,
  CreditCardBillRecord,
  CreditCardRepository,
} from '../types/asset-account.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

const BILL_COLUMNS =
  'id, account_id, bill_month, total_amount, paid_amount, due_date, status, created_at, updated_at';

/**
 * 根据已还金额计算账单状态
 *
 * @param totalAmount - 账单总额（分）
 * @param paidAmount - 已还金额（分）
 * @returns 状态
 */
export function resolveBillStatus(totalAmount: number, paidAmount: number): CreditBillStatus {
  if (paidAmount <= 0) {
    return 'unpaid';
  }
  if (paidAmount >= totalAmount) {
    return 'paid';
  }
  return 'partial';
}

/**
 * 将数据库行转为信用卡账单
 *
 * @param row - 查询结果行
 * @returns 账单记录
 */
function toBillRecord(row: unknown): CreditCardBillRecord {
  if (typeof row !== 'object' || row === null) {
    throw new AppError(50050, '信用卡账单数据格式异常', 500);
  }
  const record = row as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.account_id !== 'string' ||
    typeof record.bill_month !== 'string' ||
    typeof record.total_amount !== 'number' ||
    typeof record.paid_amount !== 'number' ||
    typeof record.due_date !== 'string' ||
    typeof record.status !== 'string' ||
    typeof record.created_at !== 'string' ||
    typeof record.updated_at !== 'string'
  ) {
    throw new AppError(50050, '信用卡账单数据格式异常', 500);
  }
  return {
    id: record.id,
    account_id: record.account_id,
    bill_month: record.bill_month.slice(0, 10),
    total_amount: record.total_amount,
    paid_amount: record.paid_amount,
    due_date: record.due_date.slice(0, 10),
    status: record.status as CreditBillStatus,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export const creditCardRepository: CreditCardRepository = {
  /**
   * 创建信用卡账单
   *
   * @param accountId - 信用卡账户 UUID
   * @param billMonth - 账单月 YYYY-MM-DD
   * @param totalAmount - 账单总额（分）
   * @param dueDate - 还款日 YYYY-MM-DD
   * @returns 账单
   */
  async createBill(
    accountId: string,
    billMonth: string,
    totalAmount: number,
    dueDate: string,
  ): Promise<CreditCardBillRecord> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('credit_card_bills')
        .insert({
          account_id: accountId,
          bill_month: billMonth,
          total_amount: totalAmount,
          paid_amount: 0,
          due_date: dueDate,
          status: 'unpaid',
        })
        .select(BILL_COLUMNS)
        .single();
      if (error || !data) {
        logger.error('Failed to create credit bill', { accountId, error: error?.message });
        throw new AppError(50051, '创建信用卡账单失败', 500);
      }
      return toBillRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to create credit bill', { accountId, error });
      throw new AppError(50051, '创建信用卡账单失败', 500);
    }
  },

  /**
   * 查询账户账单列表
   *
   * @param accountId - 账户 UUID
   * @returns 账单列表
   */
  async findBillsByAccount(accountId: string): Promise<CreditCardBillRecord[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('credit_card_bills')
        .select(BILL_COLUMNS)
        .eq('account_id', accountId)
        .order('bill_month', { ascending: false });
      if (error) {
        logger.error('Failed to list credit bills', { accountId, error: error.message });
        throw new AppError(50052, '查询信用卡账单失败', 500);
      }
      return (data ?? []).map(toBillRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to list credit bills', { accountId, error });
      throw new AppError(50052, '查询信用卡账单失败', 500);
    }
  },

  /**
   * 按 ID 查询账单
   *
   * @param billId - 账单 UUID
   * @returns 账单或 null
   */
  async findBillById(billId: string): Promise<CreditCardBillRecord | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('credit_card_bills')
        .select(BILL_COLUMNS)
        .eq('id', billId)
        .maybeSingle();
      if (error) {
        logger.error('Failed to get credit bill', { billId, error: error.message });
        throw new AppError(50052, '查询信用卡账单失败', 500);
      }
      return data ? toBillRecord(data) : null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to get credit bill', { billId, error });
      throw new AppError(50052, '查询信用卡账单失败', 500);
    }
  },

  /**
   * 更新已还金额与状态
   *
   * @param billId - 账单 UUID
   * @param paidAmount - 已还金额（分）
   * @returns 更新后账单
   */
  async updatePaidAmount(billId: string, paidAmount: number): Promise<CreditCardBillRecord> {
    try {
      const existing = await creditCardRepository.findBillById(billId);
      if (!existing) {
        throw new AppError(40405, '信用卡账单不存在', 404);
      }
      const status = resolveBillStatus(existing.total_amount, paidAmount);
      const { data, error } = await getSupabaseClient()
        .from('credit_card_bills')
        .update({
          paid_amount: paidAmount,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', billId)
        .select(BILL_COLUMNS)
        .single();
      if (error || !data) {
        logger.error('Failed to update credit bill', { billId, error: error?.message });
        throw new AppError(50053, '更新信用卡账单失败', 500);
      }
      return toBillRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to update credit bill', { billId, error });
      throw new AppError(50053, '更新信用卡账单失败', 500);
    }
  },
};
