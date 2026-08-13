/**
 * @fileoverview 资产账户业务逻辑：创建、查询、流水、删除与信用卡账单
 * @module services/asset-account.service
 */

import {
  defaultIconForType,
  assetAccountRepository,
} from '../repositories/asset-account.repository';
import { assetTransactionRepository } from '../repositories/asset-transaction.repository';
import {
  creditCardRepository,
} from '../repositories/credit-card.repository';
import {
  AssetAccountDetailResult,
  AssetAccountListResult,
  AssetAccountRecord,
  AssetAccountRepository,
  AssetAccountType,
  AssetAccountView,
  AssetTransactionRecord,
  AssetTransactionRepository,
  AssetTransactionType,
  AssetTransactionView,
  CreditCardBillRecord,
  CreditCardBillView,
  CreditCardRepository,
  CreateAssetAccountInput,
} from '../types/asset-account.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import { formatYuan } from '../utils/money';

const ACCOUNT_TYPES: ReadonlySet<string> = new Set([
  'deposit',
  'credit',
  'fund',
  'stock',
  'other',
]);

/**
 * 将账户记录转为带元字符串的视图
 *
 * @param account - 账户记录
 * @returns 视图
 */
function toAccountView(account: AssetAccountRecord): AssetAccountView {
  return {
    ...account,
    balance_yuan: formatYuan(account.balance),
    cost_basis_yuan: formatYuan(account.cost_basis),
  };
}

/**
 * 将流水记录转为视图
 *
 * @param tx - 流水记录
 * @returns 视图
 */
function toTxView(tx: AssetTransactionRecord): AssetTransactionView {
  return {
    ...tx,
    amount_yuan: formatYuan(tx.amount),
    balance_after_yuan: formatYuan(tx.balance_after),
  };
}

/**
 * 将账单转为视图
 *
 * @param bill - 账单记录
 * @returns 视图
 */
function toBillView(bill: CreditCardBillRecord): CreditCardBillView {
  return {
    ...bill,
    total_amount_yuan: formatYuan(bill.total_amount),
    paid_amount_yuan: formatYuan(bill.paid_amount),
  };
}

/**
 * 校验账户类型及相关必填字段
 *
 * @param input - 创建参数
 */
function validateCreateInput(input: CreateAssetAccountInput): void {
  if (!ACCOUNT_TYPES.has(input.type)) {
    throw new AppError(40005, '账户类型无效', 400);
  }
  if (input.type === 'other' && typeof input.is_positive !== 'boolean') {
    throw new AppError(40008, 'other 类型必须指定 is_positive', 400);
  }
  if (input.type === 'stock') {
    if (!input.stock_code || !input.market) {
      throw new AppError(40009, 'stock 类型必须指定 stock_code 和 market', 400);
    }
  }
}

/**
 * 创建资产账户服务
 *
 * @param accounts - 账户仓储
 * @param transactions - 流水仓储
 * @param creditCards - 信用卡账单仓储
 * @returns 业务方法集合
 */
export function createAssetAccountService(
  accounts: AssetAccountRepository,
  transactions: AssetTransactionRepository,
  creditCards: CreditCardRepository,
): {
  createAccount(
    userId: string,
    input: CreateAssetAccountInput & { initial_balance?: number },
  ): Promise<AssetAccountView>;
  getUserAccounts(userId: string, includeInactive?: boolean): Promise<AssetAccountListResult>;
  getAccountDetail(
    userId: string,
    accountId: string,
    limit?: number,
    offset?: number,
  ): Promise<AssetAccountDetailResult>;
  recordTransaction(
    userId: string,
    accountId: string,
    payload: {
      amount: number;
      type: AssetTransactionType;
      category?: string;
      note?: string;
      happened_at?: string;
      shares?: number;
    },
  ): Promise<{ account: AssetAccountView; transaction: AssetTransactionView }>;
  deleteAccount(userId: string, accountId: string): Promise<void>;
  createCreditBill(
    userId: string,
    accountId: string,
    billMonth: string,
    totalAmount: number,
    dueDate: string,
  ): Promise<CreditCardBillView>;
  listCreditBills(userId: string, accountId: string): Promise<CreditCardBillView[]>;
  repayCreditBill(
    userId: string,
    billId: string,
    repayAmount: number,
  ): Promise<CreditCardBillView>;
} {
  return {
    /**
     * 创建资产账户
     *
     * @param userId - 用户 UUID
     * @param input - 创建参数（含 initial_balance）
     * @returns 账户视图
     */
    async createAccount(userId, input) {
      validateCreateInput(input);
      const balance = input.initial_balance ?? input.balance ?? 0;
      const created = await accounts.create(userId, {
        name: input.name,
        type: input.type,
        icon: input.icon ?? defaultIconForType(input.type),
        balance,
        is_positive: input.is_positive,
        stock_code: input.stock_code,
        market: input.market,
        shares: input.shares ?? 0,
        cost_basis: input.cost_basis ?? 0,
      });
      logger.info('Asset account created', { userId, accountId: created.id, type: created.type });
      return toAccountView(created);
    },

    /**
     * 获取用户账户列表与总资产
     *
     * @param userId - 用户 UUID
     * @param includeInactive - 是否包含停用账户
     * @returns 列表结果
     */
    async getUserAccounts(userId, includeInactive = false) {
      const list = await accounts.findByUser(userId, includeInactive);
      const totals = await accounts.getTotalAssets(userId);
      return {
        accounts: list.map(toAccountView),
        total_assets: totals.total,
        total_assets_yuan: formatYuan(totals.total),
        summary: {
          deposit: totals.deposit,
          credit: totals.credit,
          fund: totals.fund,
          stock: totals.stock,
          other: totals.other,
        },
      };
    },

    /**
     * 获取账户详情与分页流水
     *
     * @param userId - 用户 UUID
     * @param accountId - 账户 UUID
     * @param limit - 分页大小
     * @param offset - 偏移
     * @returns 详情
     */
    async getAccountDetail(userId, accountId, limit = 20, offset = 0) {
      const account = await accounts.findById(accountId, userId);
      if (!account || !account.is_active) {
        throw new AppError(40404, '资产账户不存在', 404);
      }
      const [txs, total] = await Promise.all([
        transactions.findByAccount(accountId, limit, offset),
        transactions.countByAccount(accountId),
      ]);
      return {
        account: toAccountView(account),
        transactions: txs.map(toTxView),
        pagination: { limit, offset, total },
      };
    },

    /**
     * 记录账户变动并更新余额/持仓
     *
     * @param userId - 用户 UUID
     * @param accountId - 账户 UUID
     * @param payload - 变动参数
     * @returns 更新后账户与流水
     */
    async recordTransaction(userId, accountId, payload) {
      const account = await accounts.findById(accountId, userId);
      if (!account || !account.is_active) {
        throw new AppError(40404, '资产账户不存在', 404);
      }

      let amount = payload.amount;
      // 还款：将金额按「减少负债」方向处理（信用卡余额一般为负数欠款）
      if (payload.type === 'repayment') {
        amount = Math.abs(amount);
        if (account.type === 'credit' && account.balance <= 0) {
          // 欠款为负：还款应增加余额（向 0 靠近）
          amount = Math.abs(amount);
        }
      }
      if (payload.type === 'expense' || payload.type === 'buy') {
        amount = -Math.abs(amount);
      }
      if (
        payload.type === 'income' ||
        payload.type === 'interest' ||
        payload.type === 'dividend' ||
        payload.type === 'sell'
      ) {
        amount = Math.abs(amount);
      }

      const newBalance = account.balance + amount;
      const isAssetLike =
        account.type === 'deposit' ||
        account.type === 'fund' ||
        account.type === 'stock' ||
        (account.type === 'other' && account.is_positive);
      if (isAssetLike && amount < 0 && newBalance < 0) {
        throw new AppError(40006, '账户余额不足', 400);
      }

      let updated = await accounts.updateBalance(accountId, userId, newBalance);

      if (account.type === 'stock' && (payload.type === 'buy' || payload.type === 'sell')) {
        const shareDelta = Math.abs(payload.shares ?? 0);
        let nextShares = account.shares;
        let nextCost = account.cost_basis;
        if (payload.type === 'buy') {
          nextShares = account.shares + shareDelta;
          nextCost = account.cost_basis + Math.abs(amount);
        } else {
          if (shareDelta > account.shares) {
            throw new AppError(40006, '账户余额不足', 400);
          }
          const avg =
            account.shares > 0 ? Math.floor(account.cost_basis / account.shares) : 0;
          nextShares = account.shares - shareDelta;
          nextCost = Math.max(0, account.cost_basis - avg * shareDelta);
        }
        updated = await accounts.updateStockHolding(accountId, userId, nextShares, nextCost);
      }

      const tx = await transactions.create({
        account_id: accountId,
        amount,
        balance_after: newBalance,
        type: payload.type,
        category: payload.category,
        note: payload.note,
        happened_at: payload.happened_at,
      });

      logger.info('Asset transaction recorded', {
        userId,
        accountId,
        type: payload.type,
        amount,
      });
      return {
        account: toAccountView(updated),
        transaction: toTxView(tx),
      };
    },

    /**
     * 逻辑删除无流水账户
     *
     * @param userId - 用户 UUID
     * @param accountId - 账户 UUID
     */
    async deleteAccount(userId, accountId) {
      const account = await accounts.findById(accountId, userId);
      if (!account || !account.is_active) {
        throw new AppError(40404, '资产账户不存在', 404);
      }
      const count = await transactions.countByAccount(accountId);
      if (count > 0) {
        throw new AppError(40901, '账户有流水记录，无法删除', 409);
      }
      await accounts.delete(accountId, userId);
      logger.info('Asset account soft-deleted', { userId, accountId });
    },

    /**
     * 生成信用卡账单
     *
     * @param userId - 用户 UUID
     * @param accountId - 信用卡账户
     * @param billMonth - 账单月
     * @param totalAmount - 总额（分）
     * @param dueDate - 还款日
     * @returns 账单视图
     */
    async createCreditBill(userId, accountId, billMonth, totalAmount, dueDate) {
      const account = await accounts.findById(accountId, userId);
      if (!account || !account.is_active) {
        throw new AppError(40404, '资产账户不存在', 404);
      }
      if (account.type !== 'credit') {
        throw new AppError(40005, '账户类型无效', 400);
      }
      const bill = await creditCards.createBill(accountId, billMonth, totalAmount, dueDate);
      return toBillView(bill);
    },

    /**
     * 查询信用卡账单列表
     *
     * @param userId - 用户 UUID
     * @param accountId - 账户 UUID
     * @returns 账单列表
     */
    async listCreditBills(userId, accountId) {
      const account = await accounts.findById(accountId, userId);
      if (!account || !account.is_active) {
        throw new AppError(40404, '资产账户不存在', 404);
      }
      const bills = await creditCards.findBillsByAccount(accountId);
      return bills.map(toBillView);
    },

    /**
     * 信用卡账单还款
     *
     * @param userId - 用户 UUID
     * @param billId - 账单 UUID
     * @param repayAmount - 本次还款金额（分）
     * @returns 更新后账单
     */
    async repayCreditBill(userId, billId, repayAmount) {
      const bill = await creditCards.findBillById(billId);
      if (!bill) {
        throw new AppError(40405, '信用卡账单不存在', 404);
      }
      const account = await accounts.findById(bill.account_id, userId);
      if (!account || !account.is_active) {
        throw new AppError(40404, '资产账户不存在', 404);
      }
      const remaining = bill.total_amount - bill.paid_amount;
      if (repayAmount > remaining) {
        throw new AppError(40007, '信用卡还款金额超出未还金额', 400);
      }
      const nextPaid = bill.paid_amount + repayAmount;
      const updated = await creditCards.updatePaidAmount(billId, nextPaid);
      // 同步账户余额：还款减少欠款（负余额向 0 靠近）
      await accounts.updateBalance(account.id, userId, account.balance + Math.abs(repayAmount));
      return toBillView(updated);
    },
  };
}

export const assetAccountService = createAssetAccountService(
  assetAccountRepository,
  assetTransactionRepository,
  creditCardRepository,
);

export type { AssetAccountType };
