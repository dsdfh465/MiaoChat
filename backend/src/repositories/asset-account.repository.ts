/**
 * @fileoverview 资产账户数据访问层
 * @module repositories/asset-account.repository
 */

import { getSupabaseClient } from '../config/database';
import {
  AssetAccountRecord,
  AssetAccountRepository,
  AssetAccountType,
  AssetTotals,
  CreateAssetAccountInput,
} from '../types/asset-account.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

const ACCOUNT_COLUMNS =
  'id, user_id, name, type, balance, currency, icon, is_active, is_positive, stock_code, market, shares, cost_basis, created_at, updated_at';

/**
 * 将数据库行转为资产账户记录
 *
 * @param row - 查询结果行
 * @returns 资产账户记录
 */
function toAccountRecord(row: unknown): AssetAccountRecord {
  if (typeof row !== 'object' || row === null) {
    throw new AppError(50041, '资产账户数据格式异常', 500);
  }
  const record = row as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.user_id !== 'string' ||
    typeof record.name !== 'string' ||
    typeof record.type !== 'string' ||
    typeof record.balance !== 'number' ||
    typeof record.currency !== 'string' ||
    typeof record.icon !== 'string' ||
    typeof record.is_active !== 'boolean' ||
    typeof record.is_positive !== 'boolean' ||
    typeof record.shares !== 'number' ||
    typeof record.cost_basis !== 'number' ||
    typeof record.created_at !== 'string' ||
    typeof record.updated_at !== 'string'
  ) {
    throw new AppError(50041, '资产账户数据格式异常', 500);
  }
  return {
    id: record.id,
    user_id: record.user_id,
    name: record.name,
    type: record.type as AssetAccountType,
    balance: record.balance,
    currency: record.currency,
    icon: record.icon,
    is_active: record.is_active,
    is_positive: record.is_positive,
    stock_code: typeof record.stock_code === 'string' ? record.stock_code : null,
    market: typeof record.market === 'string' ? record.market : null,
    shares: record.shares,
    cost_basis: record.cost_basis,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

/**
 * 默认图标
 *
 * @param type - 账户类型
 * @returns emoji
 */
export function defaultIconForType(type: AssetAccountType): string {
  switch (type) {
    case 'deposit':
    case 'credit':
      return '💳';
    case 'fund':
      return '📈';
    case 'stock':
      return '📊';
    default:
      return '📦';
  }
}

/**
 * 按规则汇总总资产
 *
 * @param accounts - 账户列表
 * @returns 汇总
 */
export function summarizeAssets(accounts: AssetAccountRecord[]): AssetTotals {
  const totals: AssetTotals = {
    total: 0,
    deposit: 0,
    credit: 0,
    fund: 0,
    stock: 0,
    other: 0,
  };
  for (const account of accounts) {
    if (!account.is_active) {
      continue;
    }
    switch (account.type) {
      case 'deposit':
        totals.deposit += account.balance;
        totals.total += account.balance;
        break;
      case 'credit':
        totals.credit += account.balance;
        totals.total += account.balance;
        break;
      case 'fund':
        totals.fund += account.balance;
        totals.total += account.balance;
        break;
      case 'stock':
        totals.stock += account.balance;
        totals.total += account.balance;
        break;
      case 'other':
        if (account.is_positive) {
          totals.other += account.balance;
          totals.total += account.balance;
        }
        break;
      default:
        break;
    }
  }
  return totals;
}

export const assetAccountRepository: AssetAccountRepository = {
  /**
   * 创建资产账户
   *
   * @param userId - 用户 UUID
   * @param input - 创建参数
   * @returns 新建账户
   */
  async create(userId: string, input: CreateAssetAccountInput): Promise<AssetAccountRecord> {
    try {
      const icon = input.icon ?? defaultIconForType(input.type);
      const { data, error } = await getSupabaseClient()
        .from('asset_accounts')
        .insert({
          user_id: userId,
          name: input.name,
          type: input.type,
          balance: input.balance ?? 0,
          icon,
          is_positive: input.type === 'other' ? Boolean(input.is_positive) : true,
          stock_code: input.type === 'stock' ? input.stock_code ?? null : null,
          market: input.type === 'stock' ? input.market ?? null : null,
          shares: input.shares ?? 0,
          cost_basis: input.cost_basis ?? 0,
        })
        .select(ACCOUNT_COLUMNS)
        .single();

      if (error || !data) {
        logger.error('Failed to create asset account', { userId, error: error?.message });
        throw new AppError(50042, '创建资产账户失败', 500);
      }
      return toAccountRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to create asset account', { userId, error });
      throw new AppError(50042, '创建资产账户失败', 500);
    }
  },

  /**
   * 查询用户资产账户列表
   *
   * @param userId - 用户 UUID
   * @param includeInactive - 是否包含停用账户
   * @returns 账户列表
   */
  async findByUser(userId: string, includeInactive = false): Promise<AssetAccountRecord[]> {
    try {
      let query = getSupabaseClient()
        .from('asset_accounts')
        .select(ACCOUNT_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      const { data, error } = await query;
      if (error) {
        logger.error('Failed to list asset accounts', { userId, error: error.message });
        throw new AppError(50043, '查询资产账户失败', 500);
      }
      return (data ?? []).map(toAccountRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to list asset accounts', { userId, error });
      throw new AppError(50043, '查询资产账户失败', 500);
    }
  },

  /**
   * 按 ID 查询账户（校验归属）
   *
   * @param id - 账户 UUID
   * @param userId - 用户 UUID
   * @returns 账户或 null
   */
  async findById(id: string, userId: string): Promise<AssetAccountRecord | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('asset_accounts')
        .select(ACCOUNT_COLUMNS)
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        logger.error('Failed to get asset account', { id, userId, error: error.message });
        throw new AppError(50043, '查询资产账户失败', 500);
      }
      return data ? toAccountRecord(data) : null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to get asset account', { id, userId, error });
      throw new AppError(50043, '查询资产账户失败', 500);
    }
  },

  /**
   * 更新账户余额
   *
   * @param id - 账户 UUID
   * @param userId - 用户 UUID
   * @param newBalance - 新余额（分）
   * @returns 更新后账户
   */
  async updateBalance(
    id: string,
    userId: string,
    newBalance: number,
  ): Promise<AssetAccountRecord> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('asset_accounts')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select(ACCOUNT_COLUMNS)
        .single();
      if (error || !data) {
        logger.error('Failed to update asset balance', { id, userId, error: error?.message });
        throw new AppError(50044, '更新资产余额失败', 500);
      }
      return toAccountRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to update asset balance', { id, userId, error });
      throw new AppError(50044, '更新资产余额失败', 500);
    }
  },

  /**
   * 更新股票持仓
   *
   * @param id - 账户 UUID
   * @param userId - 用户 UUID
   * @param shares - 股数
   * @param costBasis - 成本（分）
   * @returns 更新后账户
   */
  async updateStockHolding(
    id: string,
    userId: string,
    shares: number,
    costBasis: number,
  ): Promise<AssetAccountRecord> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('asset_accounts')
        .update({
          shares,
          cost_basis: costBasis,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select(ACCOUNT_COLUMNS)
        .single();
      if (error || !data) {
        logger.error('Failed to update stock holding', { id, userId, error: error?.message });
        throw new AppError(50045, '更新股票持仓失败', 500);
      }
      return toAccountRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to update stock holding', { id, userId, error });
      throw new AppError(50045, '更新股票持仓失败', 500);
    }
  },

  /**
   * 逻辑删除账户
   *
   * @param id - 账户 UUID
   * @param userId - 用户 UUID
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await getSupabaseClient()
        .from('asset_accounts')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) {
        logger.error('Failed to delete asset account', { id, userId, error: error.message });
        throw new AppError(50046, '删除资产账户失败', 500);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to delete asset account', { id, userId, error });
      throw new AppError(50046, '删除资产账户失败', 500);
    }
  },

  /**
   * 计算用户总资产
   *
   * @param userId - 用户 UUID
   * @returns 分类汇总
   */
  async getTotalAssets(userId: string): Promise<AssetTotals> {
    const accounts = await assetAccountRepository.findByUser(userId, false);
    return summarizeAssets(accounts);
  },
};
