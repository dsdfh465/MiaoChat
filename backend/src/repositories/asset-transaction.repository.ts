/**
 * @fileoverview 资产账户流水数据访问层
 * @module repositories/asset-transaction.repository
 */

import { getSupabaseClient } from '../config/database';
import {
  AssetTransactionRecord,
  AssetTransactionRepository,
  AssetTransactionType,
  CreateAssetTransactionInput,
} from '../types/asset-account.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

const TX_COLUMNS =
  'id, account_id, amount, balance_after, type, category, note, happened_at, created_at';

/**
 * 将数据库行转为资产流水记录
 *
 * @param row - 查询结果行
 * @returns 流水记录
 */
function toTxRecord(row: unknown): AssetTransactionRecord {
  if (typeof row !== 'object' || row === null) {
    throw new AppError(50047, '资产流水数据格式异常', 500);
  }
  const record = row as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.account_id !== 'string' ||
    typeof record.amount !== 'number' ||
    typeof record.balance_after !== 'number' ||
    typeof record.type !== 'string' ||
    typeof record.happened_at !== 'string' ||
    typeof record.created_at !== 'string'
  ) {
    throw new AppError(50047, '资产流水数据格式异常', 500);
  }
  return {
    id: record.id,
    account_id: record.account_id,
    amount: record.amount,
    balance_after: record.balance_after,
    type: record.type as AssetTransactionType,
    category: typeof record.category === 'string' ? record.category : null,
    note: typeof record.note === 'string' ? record.note : null,
    happened_at: record.happened_at,
    created_at: record.created_at,
  };
}

export const assetTransactionRepository: AssetTransactionRepository = {
  /**
   * 创建资产流水
   *
   * @param input - 流水参数
   * @returns 新建流水
   */
  async create(input: CreateAssetTransactionInput): Promise<AssetTransactionRecord> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('asset_transactions')
        .insert({
          account_id: input.account_id,
          amount: input.amount,
          balance_after: input.balance_after,
          type: input.type,
          category: input.category ?? null,
          note: input.note ?? null,
          happened_at: input.happened_at ?? new Date().toISOString(),
        })
        .select(TX_COLUMNS)
        .single();
      if (error || !data) {
        logger.error('Failed to create asset transaction', { error: error?.message });
        throw new AppError(50048, '创建资产流水失败', 500);
      }
      return toTxRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to create asset transaction', { error });
      throw new AppError(50048, '创建资产流水失败', 500);
    }
  },

  /**
   * 按账户查询流水
   *
   * @param accountId - 账户 UUID
   * @param limit - 条数
   * @param offset - 偏移
   * @returns 流水列表
   */
  async findByAccount(
    accountId: string,
    limit = 20,
    offset = 0,
  ): Promise<AssetTransactionRecord[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('asset_transactions')
        .select(TX_COLUMNS)
        .eq('account_id', accountId)
        .order('happened_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) {
        logger.error('Failed to list asset transactions', { accountId, error: error.message });
        throw new AppError(50049, '查询资产流水失败', 500);
      }
      return (data ?? []).map(toTxRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to list asset transactions', { accountId, error });
      throw new AppError(50049, '查询资产流水失败', 500);
    }
  },

  /**
   * 按用户查询全部账户流水
   *
   * @param userId - 用户 UUID
   * @param limit - 条数
   * @param offset - 偏移
   * @returns 流水列表
   */
  async findByUser(
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<AssetTransactionRecord[]> {
    try {
      const { data: accounts, error: accountError } = await getSupabaseClient()
        .from('asset_accounts')
        .select('id')
        .eq('user_id', userId);
      if (accountError) {
        logger.error('Failed to list accounts for transactions', {
          userId,
          error: accountError.message,
        });
        throw new AppError(50049, '查询资产流水失败', 500);
      }
      const ids = (accounts ?? [])
        .map((item) => (item as { id?: string }).id)
        .filter((id): id is string => typeof id === 'string');
      if (ids.length === 0) {
        return [];
      }
      const { data, error } = await getSupabaseClient()
        .from('asset_transactions')
        .select(TX_COLUMNS)
        .in('account_id', ids)
        .order('happened_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) {
        logger.error('Failed to list user asset transactions', { userId, error: error.message });
        throw new AppError(50049, '查询资产流水失败', 500);
      }
      return (data ?? []).map(toTxRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to list user asset transactions', { userId, error });
      throw new AppError(50049, '查询资产流水失败', 500);
    }
  },

  /**
   * 统计账户流水条数
   *
   * @param accountId - 账户 UUID
   * @returns 条数
   */
  async countByAccount(accountId: string): Promise<number> {
    try {
      const { count, error } = await getSupabaseClient()
        .from('asset_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId);
      if (error) {
        logger.error('Failed to count asset transactions', { accountId, error: error.message });
        throw new AppError(50049, '查询资产流水失败', 500);
      }
      return count ?? 0;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to count asset transactions', { accountId, error });
      throw new AppError(50049, '查询资产流水失败', 500);
    }
  },
};
