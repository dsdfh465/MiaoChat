/**
 * @fileoverview 预算业务逻辑：设定、进度计算与月度总览
 * @module services/budget.service
 */

import { budgetRepository } from '../repositories/budget.repository';
import { categoryRepository } from '../repositories/category.repository';
import { transactionRepository } from '../repositories/transaction.repository';
import {
  BudgetListResult,
  BudgetOverview,
  BudgetProgressItem,
  BudgetRecord,
  BudgetRepository,
  BudgetView,
  MonthlyBudgetProgress,
} from '../types/budget.types';
import { CategoryRecord, CategoryRepository, TransactionRepository } from '../types/transaction.types';
import { AppError } from '../utils/app-error';
import { calcBudgetPercentage, resolveBudgetStatus } from '../utils/budget-status';
import { logger } from '../utils/logger';
import { formatYuan } from '../utils/money';

/**
 * 将预算记录转为接口视图
 *
 * @param record - 仓储层预算记录
 * @returns 含 limit_yuan 的视图
 */
function toBudgetView(record: BudgetRecord): BudgetView {
  return {
    id: record.id,
    category_id: record.category_id,
    category_name: record.category_name,
    category_icon: record.category_icon,
    month: record.month,
    limit_amount: record.limit_amount,
    limit_yuan: formatYuan(record.limit_amount),
  };
}

/**
 * 校验分类存在且属于当前用户或为系统分类
 *
 * @param category - 分类记录
 * @param userId - 当前用户 UUID
 * @returns void
 */
function assertCategoryAccessible(category: CategoryRecord | null, userId: string): void {
  if (!category) {
    throw new AppError(40402, '分类不存在', 404);
  }
  if (!category.is_system && category.user_id !== userId) {
    throw new AppError(40402, '分类不存在', 404);
  }
}

/**
 * 创建预算服务，便于单元测试注入 Repository
 *
 * @param budgets - 预算数据访问实现
 * @param categories - 分类数据访问实现
 * @param transactions - 交易数据访问实现
 * @returns 预算业务方法
 */
export function createBudgetService(
  budgets: BudgetRepository,
  categories: CategoryRepository,
  transactions: TransactionRepository,
): {
  setBudget(
    userId: string,
    categoryId: string,
    month: string,
    limitAmount: number,
  ): Promise<BudgetView>;
  getUserBudgets(userId: string, month: string): Promise<BudgetListResult>;
  getBudgetProgress(
    userId: string,
    categoryId: string,
    month: string,
  ): Promise<BudgetProgressItem>;
  getMonthlyOverview(userId: string, month: string): Promise<BudgetOverview>;
  getAllCategoryProgress(userId: string, month: string): Promise<BudgetProgressItem[]>;
  getMonthProgress(userId: string, month: string): Promise<MonthlyBudgetProgress>;
  deleteBudget(userId: string, categoryId: string, month: string): Promise<void>;
} {
  const service = {
    /**
     * 设置月度预算：已存在则更新，否则新建
     *
     * @param userId - 当前用户 UUID
     * @param categoryId - 分类 UUID
     * @param month - YYYY-MM
     * @param limitAmount - 预算额度（分）
     * @returns 预算视图
     */
    async setBudget(
      userId: string,
      categoryId: string,
      month: string,
      limitAmount: number,
    ): Promise<BudgetView> {
      try {
        if (!Number.isInteger(limitAmount) || limitAmount <= 0) {
          throw new AppError(40001, '预算金额必须大于0', 400);
        }
        const category = await categories.findById(categoryId);
        assertCategoryAccessible(category, userId);
        const record = await budgets.setBudget(userId, categoryId, month, limitAmount);
        logger.info('Budget upserted', { userId, categoryId, month });
        return toBudgetView(record);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to set budget', { userId, error });
        throw new AppError(50034, '创建预算失败', 500);
      }
    },

    /**
     * 查询某月所有分类预算
     *
     * @param userId - 当前用户 UUID
     * @param month - YYYY-MM
     * @returns 预算列表
     */
    async getUserBudgets(userId: string, month: string): Promise<BudgetListResult> {
      try {
        const records = await budgets.getUserBudgetsForMonth(userId, month);
        return {
          month,
          budgets: records.map(toBudgetView),
        };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to list budgets', { userId, error });
        throw new AppError(50035, '查询预算失败', 500);
      }
    },

    /**
     * 获取单个分类的预算进度
     *
     * @param userId - 当前用户 UUID
     * @param categoryId - 分类 UUID
     * @param month - YYYY-MM
     * @returns 分类进度
     */
    async getBudgetProgress(
      userId: string,
      categoryId: string,
      month: string,
    ): Promise<BudgetProgressItem> {
      try {
        const budget = await budgets.getBudget(userId, categoryId, month);
        if (!budget) {
          throw new AppError(40403, '预算不存在', 404);
        }
        const spent = await transactions.getCategoryTotalByMonth(userId, categoryId, month);
        return toCategoryProgress(budget, spent.total);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to get budget progress', { userId, error });
        throw new AppError(50037, '计算预算进度失败', 500);
      }
    },

    /**
     * 获取月度总览：总预算、已设预算分类的总支出、剩余与整体进度
     *
     * @param userId - 当前用户 UUID
     * @param month - YYYY-MM
     * @returns 月度总览
     */
    async getMonthlyOverview(userId: string, month: string): Promise<BudgetOverview> {
      try {
        const items = await service.getAllCategoryProgress(userId, month);
        return toOverview(items);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to get monthly overview', { userId, error });
        throw new AppError(50037, '计算预算进度失败', 500);
      }
    },

    /**
     * 获取所有已设预算分类的进度
     *
     * @param userId - 当前用户 UUID
     * @param month - YYYY-MM
     * @returns 分类进度列表
     */
    async getAllCategoryProgress(userId: string, month: string): Promise<BudgetProgressItem[]> {
      try {
        const records = await budgets.getUserBudgetsForMonth(userId, month);
        const items: BudgetProgressItem[] = [];
        for (const record of records) {
          const spent = await transactions.getCategoryTotalByMonth(
            userId,
            record.category_id,
            month,
          );
          items.push(toCategoryProgress(record, spent.total));
        }
        return items;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to get category progress', { userId, error });
        throw new AppError(50037, '计算预算进度失败', 500);
      }
    },

    /**
     * 月度进度总接口：总览 + 各分类进度
     *
     * @param userId - 当前用户 UUID
     * @param month - YYYY-MM
     * @returns 月度进度
     */
    async getMonthProgress(userId: string, month: string): Promise<MonthlyBudgetProgress> {
      try {
        const categoryItems = await service.getAllCategoryProgress(userId, month);
        return {
          month,
          overview: toOverview(categoryItems),
          categories: categoryItems,
        };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to get month progress', { userId, error });
        throw new AppError(50037, '计算预算进度失败', 500);
      }
    },

    /**
     * 删除某分类月度预算
     *
     * @param userId - 当前用户 UUID
     * @param categoryId - 分类 UUID
     * @param month - YYYY-MM
     * @returns void
     */
    async deleteBudget(userId: string, categoryId: string, month: string): Promise<void> {
      try {
        await budgets.deleteBudget(userId, categoryId, month);
        logger.info('Budget deleted', { userId, categoryId, month });
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to delete budget', { userId, error });
        throw new AppError(50036, '删除预算失败', 500);
      }
    },
  };

  return service;
}

/**
 * 由预算额度与已花金额组装分类进度
 *
 * @param budget - 预算记录
 * @param spentAmount - 已确认支出（分）
 * @returns 分类进度
 */
function toCategoryProgress(budget: BudgetRecord, spentAmount: number): BudgetProgressItem {
  const remaining = budget.limit_amount - spentAmount;
  const percentage = calcBudgetPercentage(spentAmount, budget.limit_amount);
  return {
    category_id: budget.category_id,
    category_name: budget.category_name,
    category_icon: budget.category_icon,
    limit_amount: budget.limit_amount,
    limit_yuan: formatYuan(budget.limit_amount),
    spent_amount: spentAmount,
    spent_yuan: formatYuan(spentAmount),
    remaining_amount: remaining,
    remaining_yuan: formatYuan(remaining),
    percentage,
    status: resolveBudgetStatus(percentage),
  };
}

/**
 * 由各分类进度汇总月度总览，保证进度环与分类列表口径一致
 *
 * @param items - 已设预算的分类进度
 * @returns 月度总览
 */
function toOverview(items: BudgetProgressItem[]): BudgetOverview {
  const totalBudget = items.reduce((sum, item) => sum + item.limit_amount, 0);
  const totalSpent = items.reduce((sum, item) => sum + item.spent_amount, 0);
  const remaining = totalBudget - totalSpent;
  const percentage = calcBudgetPercentage(totalSpent, totalBudget);
  return {
    total_budget: totalBudget,
    total_budget_yuan: formatYuan(totalBudget),
    total_spent: totalSpent,
    total_spent_yuan: formatYuan(totalSpent),
    total_remaining: remaining,
    total_remaining_yuan: formatYuan(remaining),
    progress_percentage: percentage,
    status: resolveBudgetStatus(percentage),
  };
}

export const budgetService = createBudgetService(
  budgetRepository,
  categoryRepository,
  transactionRepository,
);
