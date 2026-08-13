/**
 * @fileoverview 用户画像与数据导出请求参数 Zod 校验
 * @module schemas/user.schema
 */

import { z } from 'zod';

export const PERSONALITY_VALUES = ['strict', 'gentle', 'buddha'] as const;

export const updatePersonalitySchema = z.object({
  personality: z.enum(PERSONALITY_VALUES, {
    error: '人格值无效，允许值：strict, gentle, buddha',
  }),
});

export const exportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, '月份格式必须为 YYYY-MM').optional(),
  category_id: z.string().uuid('无效的分类ID格式').optional(),
});

export type UpdatePersonalityRequest = z.infer<typeof updatePersonalitySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
