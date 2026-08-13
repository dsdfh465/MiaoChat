/**
 * @fileoverview 预算请求参数 Zod 校验
 * @module schemas/budget.schema
 */

import { z } from 'zod';

export const setBudgetSchema = z.object({
  category_id: z.string().uuid('无效的分类ID格式'),
  month: z.string().regex(/^\d{4}-\d{2}$/, '月份格式必须为 YYYY-MM'),
  limit_amount: z.number().int().positive('预算金额必须大于0'),
});

export const queryBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, '月份格式必须为 YYYY-MM'),
});

export const deleteBudgetSchema = z.object({
  category_id: z.string().uuid('无效的分类ID格式'),
  month: z.string().regex(/^\d{4}-\d{2}$/, '月份格式必须为 YYYY-MM'),
});

export type SetBudgetRequest = z.infer<typeof setBudgetSchema>;
