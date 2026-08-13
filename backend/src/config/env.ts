/**
 * @fileoverview 加载并校验后端环境变量
 * @module config/env
 */

import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_PORT = 3000;

/**
 * 将环境变量解析为合法端口号
 *
 * @param value - 原始环境变量字符串
 * @param fallback - 解析失败时的默认端口
 * @returns 可用的 TCP 端口
 */
function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return fallback;
  }
  return parsed;
}

/**
 * 判断环境变量是否为未填写的占位符
 *
 * @param value - 原始环境变量
 * @returns 是否为占位符或空值
 */
function isPlaceholder(value: string | undefined): boolean {
  if (!value) {
    return true;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes('your-project') ||
    normalized.includes('your-supabase') ||
    normalized.includes('你的')
  );
}

/** HTTP 服务监听端口，默认 3000 */
export const PORT: number = parsePort(process.env.PORT, DEFAULT_PORT);

/** Supabase 项目 URL */
export const SUPABASE_URL: string = (process.env.SUPABASE_URL ?? '').trim();

/** Supabase 匿名密钥 */
export const SUPABASE_ANON_KEY: string = (process.env.SUPABASE_ANON_KEY ?? '').trim();

/**
 * 当前进程是否已配置可用的 Supabase 连接信息
 *
 * @returns 已配置返回 true
 */
export function hasSupabaseConfig(): boolean {
  return !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_ANON_KEY);
}
