/**
 * @fileoverview 预算数据访问层，按用户+分类+月份 UPSERT
 * @module repositories/budget.repository
 */

import { getSupabaseClient } from '../config/database';
import { BudgetRecord, BudgetRepository } from '../types/budget.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import { formatYearMonth, toMonthDate } from '../utils/month-range';

const BUDGET_SELECT = `
  id,
  user_id,
  category_id,
  month,
  limit_amount,
  created_at,
  updated_at,
  categories ( name, icon )
`;

/**
 * 将 Supabase 行转为预算记录
 *
 * @param row - 查询结果行
 * @returns 预算记录
 */
function toBudgetRecord(row: unknown): BudgetRecord {
  if (typeof row !== 'object' || row === null) {
    throw new AppError(50032, '预算数据格式异常', 500);
  }
  const record = row as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.user_id !== 'string' ||
    typeof record.category_id !== 'string' ||
    typeof record.month !== 'string' ||
    typeof record.limit_amount !== 'number' ||
    typeof record.created_at !== 'string' ||
    typeof record.updated_at !== 'string'
  ) {
    throw new AppError(50032, '预算数据格式异常', 500);
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
    category_name: categoryName,
    category_icon: categoryIcon,
    month: formatYearMonth(record.month),
    limit_amount: record.limit_amount,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export const budgetRepository: BudgetRepository = {
  /**
   * 设置或更新某分类月度预算
   *
   * @param userId - 用户 UUID
   * @param categoryId - 分类 UUID
   * @param month - YYYY-MM
   * @param limitAmount - 预算额度（分）
   * @returns 预算记录
   */
  async setBudget(
    userId: string,
    categoryId: string,
    month: string,
    limitAmount: number,
  ): Promise<BudgetRecord> {
    try {
      const existing = await budgetRepository.getBudget(userId, categoryId, month);
      if (existing) {
        const { data, error } = await getSupabaseClient()
          .from('budgets')
          .update({
            limit_amount: limitAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .eq('user_id', userId)
          .select(BUDGET_SELECT)
          .single();

        if (error || !data) {
          logger.error('Failed to update budget', { userId, error: error?.message });
          throw new AppError(50033, '更新预算失败', 500);
        }
        return toBudgetRecord(data);
      }

      const { data, error } = await getSupabaseClient()
        .from('budgets')
        .insert({
          user_id: userId,
          category_id: categoryId,
          month: toMonthDate(month),
          limit_amount: limitAmount,
        })
        .select(BUDGET_SELECT)
        .single();

      if (error || !data) {
        logger.error('Failed to create budget', { userId, error: error?.message });
        throw new AppError(50034, '创建预算失败', 500);
      }
      return toBudgetRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to set budget', { userId, error });
      throw new AppError(50034, '创建预算失败', 500);
    }
  },

  /**
   * 查询单个分类的月度预算
   *
   * @param userId - 用户 UUID
   * @param categoryId - 分类 UUID
   * @param month - YYYY-MM
   * @returns 预算或 null
   */
  async getBudget(
    userId: string,
    categoryId: string,
    month: string,
  ): Promise<BudgetRecord | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('budgets')
        .select(BUDGET_SELECT)
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .eq('month', toMonthDate(month))
        .maybeSingle();

      if (error) {
        logger.error('Failed to get budget', { userId, error: error.message });
        throw new AppError(50035, '查询预算失败', 500);
      }
      if (!data) {
        return null;
      }
      return toBudgetRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to get budget', { userId, error });
      throw new AppError(50035, '查询预算失败', 500);
    }
  },

  /**
   * 查询用户某月所有分类预算
   *
   * @param userId - 用户 UUID
   * @param month - YYYY-MM
   * @returns 预算列表
   */
  async getUserBudgetsForMonth(userId: string, month: string): Promise<BudgetRecord[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('budgets')
        .select(BUDGET_SELECT)
        .eq('user_id', userId)
        .eq('month', toMonthDate(month))
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to list budgets', { userId, error: error.message });
        throw new AppError(50035, '查询预算失败', 500);
      }
      return (data ?? []).map(toBudgetRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to list budgets', { userId, error });
      throw new AppError(50035, '查询预算失败', 500);
    }
  },

  /**
   * 删除某分类的月度预算
   *
   * @param userId - 用户 UUID
   * @param categoryId - 分类 UUID
   * @param month - YYYY-MM
   * @returns void
   */
  async deleteBudget(userId: string, categoryId: string, month: string): Promise<void> {
    try {
      const existing = await budgetRepository.getBudget(userId, categoryId, month);
      if (!existing) {
        throw new AppError(40403, '预算不存在', 404);
      }

      const { error } = await getSupabaseClient()
        .from('budgets')
        .delete()
        .eq('id', existing.id)
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete budget', { userId, error: error.message });
        throw new AppError(50036, '删除预算失败', 500);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to delete budget', { userId, error });
      throw new AppError(50036, '删除预算失败', 500);
    }
  },
};
