/**
 * @fileoverview 资产账户、流水与信用卡账单相关类型
 * @module types/asset-account.types
 */

export type AssetAccountType = 'deposit' | 'credit' | 'fund' | 'stock' | 'other';

export type AssetTransactionType =
  | 'income'
  | 'expense'
  | 'interest'
  | 'repayment'
  | 'buy'
  | 'sell'
  | 'dividend';

export type CreditBillStatus = 'unpaid' | 'partial' | 'paid';

export interface AssetAccountRecord {
  id: string;
  user_id: string;
  name: string;
  type: AssetAccountType;
  balance: number;
  currency: string;
  icon: string;
  is_active: boolean;
  is_positive: boolean;
  stock_code: string | null;
  market: string | null;
  shares: number;
  cost_basis: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetAccountInput {
  name: string;
  type: AssetAccountType;
  icon?: string;
  balance?: number;
  is_positive?: boolean;
  stock_code?: string;
  market?: string;
  shares?: number;
  cost_basis?: number;
}

export interface AssetTransactionRecord {
  id: string;
  account_id: string;
  amount: number;
  balance_after: number;
  type: AssetTransactionType;
  category: string | null;
  note: string | null;
  happened_at: string;
  created_at: string;
}

export interface CreateAssetTransactionInput {
  account_id: string;
  amount: number;
  balance_after: number;
  type: AssetTransactionType;
  category?: string;
  note?: string;
  happened_at?: string;
}

export interface CreditCardBillRecord {
  id: string;
  account_id: string;
  bill_month: string;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  status: CreditBillStatus;
  created_at: string;
  updated_at: string;
}

export interface AssetTotals {
  total: number;
  deposit: number;
  credit: number;
  fund: number;
  stock: number;
  other: number;
}

export interface AssetAccountRepository {
  create(userId: string, input: CreateAssetAccountInput): Promise<AssetAccountRecord>;
  findByUser(userId: string, includeInactive?: boolean): Promise<AssetAccountRecord[]>;
  findById(id: string, userId: string): Promise<AssetAccountRecord | null>;
  updateBalance(id: string, userId: string, newBalance: number): Promise<AssetAccountRecord>;
  updateStockHolding(
    id: string,
    userId: string,
    shares: number,
    costBasis: number,
  ): Promise<AssetAccountRecord>;
  delete(id: string, userId: string): Promise<void>;
  getTotalAssets(userId: string): Promise<AssetTotals>;
}

export interface AssetTransactionRepository {
  create(input: CreateAssetTransactionInput): Promise<AssetTransactionRecord>;
  findByAccount(
    accountId: string,
    limit?: number,
    offset?: number,
  ): Promise<AssetTransactionRecord[]>;
  findByUser(userId: string, limit?: number, offset?: number): Promise<AssetTransactionRecord[]>;
  countByAccount(accountId: string): Promise<number>;
}

export interface CreditCardRepository {
  createBill(
    accountId: string,
    billMonth: string,
    totalAmount: number,
    dueDate: string,
  ): Promise<CreditCardBillRecord>;
  findBillsByAccount(accountId: string): Promise<CreditCardBillRecord[]>;
  findBillById(billId: string): Promise<CreditCardBillRecord | null>;
  updatePaidAmount(billId: string, paidAmount: number): Promise<CreditCardBillRecord>;
}

export interface AssetAccountView extends AssetAccountRecord {
  balance_yuan: string;
  cost_basis_yuan: string;
}

export interface AssetTransactionView extends AssetTransactionRecord {
  amount_yuan: string;
  balance_after_yuan: string;
}

export interface CreditCardBillView extends CreditCardBillRecord {
  total_amount_yuan: string;
  paid_amount_yuan: string;
}

export interface AssetAccountListResult {
  accounts: AssetAccountView[];
  total_assets: number;
  total_assets_yuan: string;
  summary: {
    deposit: number;
    credit: number;
    fund: number;
    stock: number;
    other: number;
  };
}

export interface AssetAccountDetailResult {
  account: AssetAccountView;
  transactions: AssetTransactionView[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}
