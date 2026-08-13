/**
 * @fileoverview Supabase 客户端初始化与连接测试
 * @module config/database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { hasSupabaseConfig, SUPABASE_ANON_KEY, SUPABASE_URL } from './env';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

let supabaseClient: SupabaseClient | null = null;

/**
 * 获取单例 Supabase 客户端
 *
 * @returns 已初始化的 Supabase 客户端
 */
export function getSupabaseClient(): SupabaseClient {
  if (!hasSupabaseConfig()) {
    throw new AppError(50001, 'Supabase 未配置', 500);
  }
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        // Node 20 无原生 WebSocket，使用 ws（Supabase 官方建议）
        transport: WebSocket as never,
      },
    });
  }
  return supabaseClient;
}

/**
 * 测试与 Supabase 的连通性
 *
 * @returns 连接成功返回 true
 */
export async function testConnection(): Promise<boolean> {
  try {
    if (!hasSupabaseConfig()) {
      logger.error('Supabase 未配置，请在 .env 中填写 SUPABASE_URL 与 SUPABASE_ANON_KEY');
      return false;
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
      logger.error('Database connection failed', { error: error.message });
      return false;
    }

    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });
    return false;
  }
}
