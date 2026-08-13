/**
 * @fileoverview 预算进度百分比与状态计算
 * @module utils/budget-status
 */

export enum BudgetStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  DANGER = 'danger',
  EXCEEDED = 'exceeded',
}

/**
 * 计算进度百分比，保留一位小数
 *
 * @param spent - 已支出（分）
 * @param limit - 预算额度（分）
 * @returns 百分比，预算为 0 时返回 0
 */
export function calcBudgetPercentage(spent: number, limit: number): number {
  if (limit <= 0) {
    return 0;
  }
  return Math.round((spent / limit) * 1000) / 10;
}

/**
 * 按进度百分比映射预算状态
 *
 * @param percentage - 进度百分比
 * @returns 状态枚举值
 */
export function resolveBudgetStatus(percentage: number): BudgetStatus {
  if (percentage >= 100) {
    return BudgetStatus.EXCEEDED;
  }
  if (percentage >= 90) {
    return BudgetStatus.DANGER;
  }
  if (percentage >= 70) {
    return BudgetStatus.WARNING;
  }
  return BudgetStatus.NORMAL;
}
