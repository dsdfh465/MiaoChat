/**
 * @fileoverview 账目流水数据访问层
 * @module repositories/transaction.repository
 */

import { getSupabaseClient } from '../config/database';
import {
  CategoryBreakdownItem,
  CreateTransactionInput,
  MonthlySummary,
  TransactionQuery,
  TransactionRecord,
  TransactionRepository,
  TransactionSource,
  UpdateTransactionData,
} from '../types/transaction.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import { getMonthRange } from '../utils/month-range';

const TRANSACTION_SELECT = `
  id,
  user_id,
  category_id,
  amount,
  note,
  recorded_at,
  source,
  is_confirmed,
  created_at,
  categories ( name, icon )
`;

/**
 * 判断来源字段是否合法
 *
 * @param value - 原始来源
 * @returns 是否为合法来源
 */
function isSource(value: unknown): value is TransactionSource {
  return value === 'voice' || value === 'manual' || value === 'import';
}

/**
 * 将 Supabase 行转为交易记录
 *
 * @param row - 查询结果行
 * @returns 交易记录
 */
function toTransactionRecord(row: unknown): TransactionRecord {
  if (typeof row !== 'object' || row === null) {
    throw new AppError(50022, '交易数据格式异常', 500);
  }
  const record = row as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.user_id !== 'string' ||
    typeof record.category_id !== 'string' ||
    typeof record.amount !== 'number' ||
    typeof record.recorded_at !== 'string' ||
    typeof record.is_confirmed !== 'boolean' ||
    typeof record.created_at !== 'string' ||
    !isSource(record.source)
  ) {
    throw new AppError(50022, '交易数据格式异常', 500);
  }
  if (record.note !== null && typeof record.note !== 'string') {
    throw new AppError(50022, '交易数据格式异常', 500);
  }

  let categoryName = '其他';
  let categoryIcon = '📌';
  const nested = Array.isArray(record.categories) ? record.categories[0] : record.categories;
  if (typeof nested === 'object' && nested !== null) {
    const category = nested as Record<string, unknown>;
    if (typeof category.name === 'string') {
      categoryName = category.name;
    }
    if (typeof category.icon === 'string') {
      categoryIcon = category.icon;
    }
  }

  return {
    id: record.id,
    user_id: record.user_id,
    category_id: record.category_id,
    amount: record.amount,
    note: record.note,
    recorded_at: record.recorded_at,
    source: record.source,
    is_confirmed: record.is_confirmed,
    created_at: record.created_at,
    category_name: categoryName,
    category_icon: categoryIcon,
  };
}

/**
 * 构建按用户筛选的查询，可选月份与分类
 *
 * @param userId - 用户 UUID
 * @param query - 列表筛选
 * @returns Supabase 查询构造器
 */
function buildUserQuery(userId: string, query: Pick<TransactionQuery, 'month' | 'categoryId'>) {
  let request = getSupabaseClient()
    .from('transactions')
    .select(TRANSACTION_SELECT, { count: 'exact' })
    .eq('user_id', userId);

  if (query.month) {
    const range = getMonthRange(query.month);
    request = request.gte('recorded_at', range.startIso).lt('recorded_at', range.endIso);
  }
  if (query.categoryId) {
    request = request.eq('category_id', query.categoryId);
  }
  return request;
}

/**
 * 查询已确认的正数支出
 *
 * @param userId - 用户 UUID
 * @param month - YYYY-MM
 * @param categoryId - 可选分类 UUID
 * @returns 金额列表
 */
async function listConfirmedExpenses(
  userId: string,
  month: string,
  categoryId?: string,
): Promise<number[]> {
  const range = getMonthRange(month);
  let request = getSupabaseClient()
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('is_confirmed', true)
    .gt('amount', 0)
    .gte('recorded_at', range.startIso)
    .lt('recorded_at', range.endIso);

  if (categoryId) {
    request = request.eq('category_id', categoryId);
  }

  const { data, error } = await request;
  if (error) {
    logger.error('Failed to list confirmed expenses', { userId, error: error.message });
    throw new AppError(50027, '汇总交易失败', 500);
  }

  const amounts: number[] = [];
  for (const row of data ?? []) {
    if (typeof row === 'object' && row !== null && typeof (row as { amount?: unknown }).amount === 'number') {
      amounts.push((row as { amount: number }).amount);
    }
  }
  return amounts;
}

/**
 * 汇总支出金额与笔数
 *
 * @param amounts - 金额列表（分）
 * @returns 总额与笔数
 */
function sumExpenses(amounts: number[]): { total: number; count: number } {
  return {
    total: amounts.reduce((sum, amount) => sum + amount, 0),
    count: amounts.length,
  };
}

export const transactionRepository: TransactionRepository = {
  /**
   * 创建一笔交易
   *
   * @param input - 创建参数
   * @returns 新建交易
   */
  async create(input: CreateTransactionInput): Promise<TransactionRecord> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('transactions')
        .insert({
          user_id: input.userId,
          category_id: input.categoryId,
          amount: input.amount,
          note: input.note,
          recorded_at: input.recordedAt,
          source: input.source,
          is_confirmed: true,
        })
        .select(TRANSACTION_SELECT)
        .single();

      if (error || !data) {
        logger.error('Failed to create transaction', { userId: input.userId, error: error?.message });
        throw new AppError(50023, '创建交易失败', 500);
      }
      return toTransactionRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to create transaction', { userId: input.userId, error });
      throw new AppError(50023, '创建交易失败', 500);
    }
  },

  /**
   * 查询用户交易列表
   *
   * @param userId - 用户 UUID
   * @param query - 月份/分类/分页
   * @returns 交易列表与总数
   */
  async findByUser(
    userId: string,
    query: TransactionQuery,
  ): Promise<{ items: TransactionRecord[]; total: number }> {
    try {
      const endIndex = query.offset + query.limit - 1;
      const { data, error, count } = await buildUserQuery(userId, query)
        .order('recorded_at', { ascending: false })
        .range(query.offset, endIndex);

      if (error) {
        logger.error('Failed to list transactions', { userId, error: error.message });
        throw new AppError(50024, '查询交易失败', 500);
      }
      return {
        items: (data ?? []).map(toTransactionRecord),
        total: count ?? 0,
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
   * 按 ID 查询交易并校验归属
   *
   * @param id - 交易 UUID
   * @param userId - 用户 UUID
   * @returns 交易或 null
   */
  async findById(id: string, userId: string): Promise<TransactionRecord | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('transactions')
        .select(TRANSACTION_SELECT)
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to get transaction', { userId, error: error.message });
        throw new AppError(50024, '查询交易失败', 500);
      }
      if (!data) {
        return null;
      }
      return toTransactionRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to get transaction', { userId, error });
      throw new AppError(50024, '查询交易失败', 500);
    }
  },

  /**
   * 更新交易
   *
   * @param id - 交易 UUID
   * @param userId - 用户 UUID
   * @param data - 可更新字段
   * @returns 更新后的交易
   */
  async update(id: string, userId: string, data: UpdateTransactionData): Promise<TransactionRecord> {
    try {
      const patch: Record<string, string | number | boolean> = {};
      if (data.categoryId !== undefined) {
        patch.category_id = data.categoryId;
      }
      if (data.amount !== undefined) {
        patch.amount = data.amount;
      }
      if (data.note !== undefined) {
        patch.note = data.note;
      }
      if (data.isConfirmed !== undefined) {
        patch.is_confirmed = data.isConfirmed;
      }

      const { data: updated, error } = await getSupabaseClient()
        .from('transactions')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId)
        .select(TRANSACTION_SELECT)
        .maybeSingle();

      if (error) {
        logger.error('Failed to update transaction', { userId, error: error.message });
        throw new AppError(50025, '更新交易失败', 500);
      }
      if (!updated) {
        throw new AppError(40401, '交易不存在', 404);
      }
      return toTransactionRecord(updated);
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
   * @param id - 交易 UUID
   * @param userId - 用户 UUID
   * @returns void
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const existing = await transactionRepository.findById(id, userId);
      if (!existing) {
        throw new AppError(40401, '交易不存在', 404);
      }

      const { error } = await getSupabaseClient()
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete transaction', { userId, error: error.message });
        throw new AppError(50026, '删除交易失败', 500);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to delete transaction', { userId, error });
      throw new AppError(50026, '删除交易失败', 500);
    }
  },

  /**
   * 月度汇总：总收入、总支出、净结余、分类明细
   *
   * @param userId - 用户 UUID
   * @param month - YYYY-MM
   * @returns 月度汇总
   */
  async getMonthlySummary(userId: string, month: string): Promise<MonthlySummary> {
    try {
      const range = getMonthRange(month);
      const { data, error } = await getSupabaseClient()
        .from('transactions')
        .select(TRANSACTION_SELECT)
        .eq('user_id', userId)
        .gte('recorded_at', range.startIso)
        .lt('recorded_at', range.endIso);

      if (error) {
        logger.error('Failed to summarize transactions', { userId, error: error.message });
        throw new AppError(50027, '汇总交易失败', 500);
      }

      const rows = (data ?? []).map(toTransactionRecord);
      let totalIncome = 0;
      let totalExpense = 0;
      const breakdownMap = new Map<string, CategoryBreakdownItem>();

      for (const row of rows) {
        if (row.amount < 0) {
          totalIncome += Math.abs(row.amount);
        } else {
          totalExpense += row.amount;
          const current = breakdownMap.get(row.category_id);
          if (current) {
            current.total += row.amount;
            current.count += 1;
          } else {
            breakdownMap.set(row.category_id, {
              category_name: row.category_name,
              category_icon: row.category_icon,
              total: row.amount,
              count: 1,
            });
          }
        }
      }

      return {
        month,
        total_income: totalIncome,
        total_expense: totalExpense,
        net_amount: totalIncome - totalExpense,
        category_breakdown: [...breakdownMap.values()],
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to summarize transactions', { userId, error });
      throw new AppError(50027, '汇总交易失败', 500);
    }
  },

  /**
   * 某分类某月已确认支出总额
   *
   * @param userId - 用户 UUID
   * @param categoryId - 分类 UUID
   * @param month - YYYY-MM
   * @returns 支出总额与笔数
   */
  async getCategoryTotalByMonth(
    userId: string,
    categoryId: string,
    month: string,
  ): Promise<{ total: number; count: number }> {
    try {
      const rows = await listConfirmedExpenses(userId, month, categoryId);
      return sumExpenses(rows);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to sum category expenses', { userId, error });
      throw new AppError(50027, '汇总交易失败', 500);
    }
  },

  /**
   * 用户某月已确认总支出
   *
   * @param userId - 用户 UUID
   * @param month - YYYY-MM
   * @returns 总支出（分）
   */
  async getTotalExpenseByMonth(userId: string, month: string): Promise<number> {
    try {
      const rows = await listConfirmedExpenses(userId, month);
      return sumExpenses(rows).total;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to sum monthly expenses', { userId, error });
      throw new AppError(50027, '汇总交易失败', 500);
    }
  },
};
