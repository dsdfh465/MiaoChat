/**
 * @fileoverview 启动时独立探测 Supabase 连通性
 * @module scripts/test-connection
 */

import { testConnection } from '../config/database';

async function main(): Promise<void> {
  const ok = await testConnection();
  if (!ok) {
    process.exit(1);
  }
}

void main();
