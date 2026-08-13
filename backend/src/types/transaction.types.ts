/**
 * @fileoverview 账目与分类领域类型
 * @module types/transaction.types
 */

export type TransactionSource = 'voice' | 'manual' | 'import';

export interface CategoryRecord {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  is_system: boolean;
  created_at: string;
}

export interface TransactionRecord {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  note: string | null;
  recorded_at: string;
  source: TransactionSource;
  is_confirmed: boolean;
  created_at: string;
  category_name: string;
  category_icon: string;
}

export interface CreateTransactionInput {
  userId: string;
  categoryId: string;
  amount: number;
  note: string | null;
  recordedAt: string;
  source: TransactionSource;
}

export interface UpdateTransactionData {
  categoryId?: string;
  amount?: number;
  note?: string;
  isConfirmed?: boolean;
}

export interface TransactionQuery {
  month?: string;
  categoryId?: string;
  limit: number;
  offset: number;
}

export interface CategoryBreakdownItem {
  category_name: string;
  category_icon: string;
  total: number;
  count: number;
}

export interface MonthlySummary {
  month: string;
  total_income: number;
  total_expense: number;
  net_amount: number;
  category_breakdown: CategoryBreakdownItem[];
}

export interface TransactionView {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  amount: number;
  amount_yuan: string;
  note: string | null;
  recorded_at: string;
  source: TransactionSource;
  is_confirmed: boolean;
}

export interface CategoryRepository {
  findSystemCategories(): Promise<CategoryRecord[]>;
  findByUser(userId: string): Promise<CategoryRecord[]>;
  findById(id: string): Promise<CategoryRecord | null>;
  findOrCreate(userId: string, categoryName: string): Promise<CategoryRecord>;
  seedSystemCategories(): Promise<void>;
}

export interface TransactionRepository {
  create(input: CreateTransactionInput): Promise<TransactionRecord>;
  findByUser(userId: string, query: TransactionQuery): Promise<{ items: TransactionRecord[]; total: number }>;
  findById(id: string, userId: string): Promise<TransactionRecord | null>;
  update(id: string, userId: string, data: UpdateTransactionData): Promise<TransactionRecord>;
  delete(id: string, userId: string): Promise<void>;
  getMonthlySummary(userId: string, month: string): Promise<MonthlySummary>;
  getCategoryTotalByMonth(
    userId: string,
    categoryId: string,
    month: string,
  ): Promise<{ total: number; count: number }>;
  getTotalExpenseByMonth(userId: string, month: string): Promise<number>;
}
