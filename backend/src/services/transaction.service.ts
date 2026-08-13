/**
 * @fileoverview 账目业务逻辑：创建、查询、更新、删除与月度汇总
 * @module services/transaction.service
 */

import { categoryRepository } from '../repositories/category.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import {
  CategoryRepository,
  MonthlySummary,
  TransactionQuery,
  TransactionRepository,
  TransactionView,
  UpdateTransactionData,
} from '../types/transaction.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import { toTransactionView } from '../utils/money';

export interface CreateTransactionPayload {
  amount: number;
  category_name: string;
  note?: string;
  recorded_at?: string;
}

export interface UpdateTransactionPayload {
  amount?: number;
  category_name?: string;
  note?: string;
  is_confirmed?: boolean;
}

export interface TransactionListResult {
  transactions: TransactionView[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

/**
 * 创建账目服务，便于单元测试注入 Repository
 *
 * @param transactions - 交易数据访问实现
 * @param categories - 分类数据访问实现
 * @returns 账目业务方法
 */
export function createTransactionService(
  transactions: TransactionRepository,
  categories: CategoryRepository,
): {
  createTransaction(userId: string, payload: CreateTransactionPayload): Promise<TransactionView>;
  getUserTransactions(userId: string, query: TransactionQuery): Promise<TransactionListResult>;
  getTransaction(userId: string, id: string): Promise<TransactionView>;
  updateTransaction(
    userId: string,
    id: string,
    payload: UpdateTransactionPayload,
  ): Promise<TransactionView>;
  deleteTransaction(userId: string, id: string): Promise<void>;
  getMonthlySummary(userId: string, month: string): Promise<MonthlySummary>;
} {
  return {
    /**
     * 创建一笔支出交易；未提供分类时默认「其他」
     *
     * @param userId - 当前用户 UUID
     * @param payload - 金额、分类名、备注、记账时间
     * @returns 完整交易视图
     */
    async createTransaction(
      userId: string,
      payload: CreateTransactionPayload,
    ): Promise<TransactionView> {
      try {
        if (!Number.isInteger(payload.amount) || payload.amount <= 0) {
          throw new AppError(40001, '金额必须大于0', 400);
        }

        const categoryName = payload.category_name.trim() || '其他';
        const category = await categories.findOrCreate(userId, categoryName);
        const recordedAt = payload.recorded_at ?? new Date().toISOString();
        const record = await transactions.create({
          userId,
          categoryId: category.id,
          amount: payload.amount,
          note: payload.note ?? null,
          recordedAt,
          source: 'voice',
        });
        logger.info('Transaction created', { userId, transactionId: record.id });
        return toTransactionView(record);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to create transaction', { userId, error });
        throw new AppError(50023, '创建交易失败', 500);
      }
    },

    /**
     * 按月份、分类分页查询用户交易，按 recorded_at 倒序
     *
     * @param userId - 当前用户 UUID
     * @param query - 筛选与分页
     * @returns 交易列表与分页信息
     */
    async getUserTransactions(
      userId: string,
      query: TransactionQuery,
    ): Promise<TransactionListResult> {
      try {
        const result = await transactions.findByUser(userId, query);
        return {
          transactions: result.items.map(toTransactionView),
          pagination: {
            limit: query.limit,
            offset: query.offset,
            total: result.total,
          },
        };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to list transactions', { userId, error });
        throw new AppError(50024, '查询交易失败', 500);
      }
    },

    /**
     * 查询单笔交易，校验归属
     *
     * @param userId - 当前用户 UUID
     * @param id - 交易 UUID
     * @returns 交易视图
     */
    async getTransaction(userId: string, id: string): Promise<TransactionView> {
      try {
        const record = await transactions.findById(id, userId);
        if (!record) {
          throw new AppError(40401, '交易不存在', 404);
        }
        return toTransactionView(record);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to get transaction', { userId, error });
        throw new AppError(50024, '查询交易失败', 500);
      }
    },

    /**
     * 更新交易的分类、金额、备注或确认状态
     *
     * @param userId - 当前用户 UUID
     * @param id - 交易 UUID
     * @param payload - 可选更新字段
     * @returns 更新后的交易视图
     */
    async updateTransaction(
      userId: string,
      id: string,
      payload: UpdateTransactionPayload,
    ): Promise<TransactionView> {
      try {
        const existing = await transactions.findById(id, userId);
        if (!existing) {
          throw new AppError(40401, '交易不存在', 404);
        }
        if (payload.amount !== undefined && (!Number.isInteger(payload.amount) || payload.amount <= 0)) {
          throw new AppError(40001, '金额必须大于0', 400);
        }

        const data: UpdateTransactionData = {};
        if (payload.category_name !== undefined) {
          const category = await categories.findOrCreate(userId, payload.category_name);
          data.categoryId = category.id;
        }
        if (payload.amount !== undefined) {
          data.amount = payload.amount;
        }
        if (payload.note !== undefined) {
          data.note = payload.note;
        }
        if (payload.is_confirmed !== undefined) {
          data.isConfirmed = payload.is_confirmed;
        }
        if (Object.keys(data).length === 0) {
          return toTransactionView(existing);
        }

        const updated = await transactions.update(id, userId, data);
        logger.info('Transaction updated', { userId, transactionId: id });
        return toTransactionView(updated);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to update transaction', { userId, error });
        throw new AppError(50025, '更新交易失败', 500);
      }
    },

    /**
     * 物理删除交易
     *
     * @param userId - 当前用户 UUID
     * @param id - 交易 UUID
     * @returns void
     */
    async deleteTransaction(userId: string, id: string): Promise<void> {
      try {
        await transactions.delete(id, userId);
        logger.info('Transaction deleted', { userId, transactionId: id });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to delete transaction', { userId, error });
        throw new AppError(50026, '删除交易失败', 500);
      }
    },

    /**
     * 月度汇总：总收入、总支出、净结余与分类明细
     *
     * @param userId - 当前用户 UUID
     * @param month - YYYY-MM
     * @returns 月度汇总
     */
    async getMonthlySummary(userId: string, month: string): Promise<MonthlySummary> {
      try {
        return await transactions.getMonthlySummary(userId, month);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to summarize transactions', { userId, error });
        throw new AppError(50027, '汇总交易失败', 500);
      }
    },
  };
}

export const transactionService = createTransactionService(
  transactionRepository,
  categoryRepository,
);
