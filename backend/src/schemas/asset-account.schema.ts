/**
 * @fileoverview 资产账户相关 Zod 校验
 * @module schemas/asset-account.schema
 */

import { z } from 'zod';

const assetTypeSchema = z.enum(['deposit', 'credit', 'fund', 'stock', 'other'], {
  message: '账户类型无效',
});

const transactionTypeSchema = z.enum(
  ['income', 'expense', 'interest', 'repayment', 'buy', 'sell', 'dividend'],
  { message: '流水类型无效' },
);

/**
 * 创建资产账户
 */
export const createAssetAccountSchema = z.object({
  name: z.string().trim().min(1, '账户名称不能为空').max(50),
  type: assetTypeSchema,
  icon: z.string().trim().min(1).max(10).optional(),
  initial_balance: z.number().int().optional(),
  is_positive: z.boolean().optional(),
  stock_code: z.string().trim().min(1).max(20).optional(),
  market: z.string().trim().min(1).max(10).optional(),
  shares: z.number().int().nonnegative().optional(),
  cost_basis: z.number().int().nonnegative().optional(),
});

/**
 * 查询账户列表
 */
export const listAssetAccountsSchema = z.object({
  include_inactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

/**
 * 账户详情分页
 */
export const assetAccountDetailQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

/**
 * 记录账户变动
 */
export const recordAssetTransactionSchema = z.object({
  amount: z.number().int().refine((value) => value !== 0, '变动金额不能为 0'),
  type: transactionTypeSchema,
  category: z.string().trim().max(50).optional(),
  note: z.string().trim().max(200).optional(),
  happened_at: z.string().min(1).optional(),
  shares: z.number().int().nonnegative().optional(),
});

/**
 * 创建信用卡账单
 */
export const createCreditBillSchema = z.object({
  bill_month: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, '账单月份格式无效'),
  total_amount: z.number().int().positive('账单金额必须大于 0'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '还款日格式必须为 YYYY-MM-DD'),
});

/**
 * 账单还款
 */
export const repayCreditBillSchema = z.object({
  amount: z.number().int().positive('还款金额必须大于 0'),
});

export type CreateAssetAccountRequest = z.infer<typeof createAssetAccountSchema>;
export type RecordAssetTransactionRequest = z.infer<typeof recordAssetTransactionSchema>;
