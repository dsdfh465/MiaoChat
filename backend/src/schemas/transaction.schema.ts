/**
 * @fileoverview 账目请求参数 Zod 校验
 * @module schemas/transaction.schema
 */

import { z } from 'zod';

export const createTransactionSchema = z.object({
  amount: z.number().int().positive('金额必须大于0'),
  category_name: z.string().min(1).optional().default('其他'),
  note: z.string().max(200).optional(),
  recorded_at: z.iso.datetime().optional(),
});

export const updateTransactionSchema = z.object({
  amount: z.number().int().positive('金额必须大于0').optional(),
  category_name: z.string().min(1).optional(),
  note: z.string().max(200).optional(),
  is_confirmed: z.boolean().optional(),
});

export const listTransactionsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, '月份格式必须为 YYYY-MM').optional(),
  category_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const monthlySummaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, '月份格式必须为 YYYY-MM'),
});

export const transactionIdParamSchema = z.object({
  id: z.string().uuid('交易 ID 必须是 UUID'),
});

export type CreateTransactionRequest = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionRequest = z.infer<typeof updateTransactionSchema>;
