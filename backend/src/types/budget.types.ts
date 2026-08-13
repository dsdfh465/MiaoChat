/**
 * @fileoverview 预算领域类型
 * @module types/budget.types
 */

import { BudgetStatus } from '../utils/budget-status';

export interface BudgetRecord {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  month: string;
  limit_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetView {
  id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  month: string;
  limit_amount: number;
  limit_yuan: string;
}

export interface BudgetProgressItem {
  category_id: string;
  category_name: string;
  category_icon: string;
  limit_amount: number;
  limit_yuan: string;
  spent_amount: number;
  spent_yuan: string;
  remaining_amount: number;
  remaining_yuan: string;
  percentage: number;
  status: BudgetStatus;
}

export interface BudgetOverview {
  total_budget: number;
  total_budget_yuan: string;
  total_spent: number;
  total_spent_yuan: string;
  total_remaining: number;
  total_remaining_yuan: string;
  progress_percentage: number;
  status: BudgetStatus;
}

export interface MonthlyBudgetProgress {
  month: string;
  overview: BudgetOverview;
  categories: BudgetProgressItem[];
}

export interface BudgetListResult {
  month: string;
  budgets: BudgetView[];
}

export interface BudgetRepository {
  setBudget(
    userId: string,
    categoryId: string,
    month: string,
    limitAmount: number,
  ): Promise<BudgetRecord>;
  getBudget(userId: string, categoryId: string, month: string): Promise<BudgetRecord | null>;
  getUserBudgetsForMonth(userId: string, month: string): Promise<BudgetRecord[]>;
  deleteBudget(userId: string, categoryId: string, month: string): Promise<void>;
}
