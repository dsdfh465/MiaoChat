/**
 * @fileoverview 登录请求体 Zod 校验 Schema
 * @module schemas/auth.schema
 */

import { z } from 'zod';

export const loginSchema = z.object({
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  code: z
    .string()
    .regex(/^\d{6}$/, '验证码格式不正确'),
});

export type LoginRequest = z.infer<typeof loginSchema>;
