/**
 * @fileoverview 妙语记账后端入口，启动 Express、挂载 v1 路由并测试数据库连接
 * @module index
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import { PORT } from './config/env';
import { testConnection } from './config/database';
import { errorMiddleware } from './middlewares/error.middleware';
import { categoryRepository } from './repositories/category.repository';
import { v1Router } from './routes/v1';
import { logger } from './utils/logger';
import { buildHealthResponse } from './utils/health';
import './types/express';

const app = express();

app.use(cors());
app.use(express.json());

/**
 * 健康检查接口，用于确认后端服务可用
 *
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @returns void
 * @example 请求 GET /health
 * @example 响应 {"status":"ok","service":"miaochat-backend","version":"1.0.0"}
 */
const healthHandler = (req: Request, res: Response): void => {
  try {
    res.status(200).json(buildHealthResponse());
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({ status: 'error' });
  }
};

app.get('/health', healthHandler);
app.use('/api/v1', v1Router);
app.use(errorMiddleware);

/**
 * 启动后探测数据库，并写入系统预设分类
 *
 * @returns Promise<void>
 */
async function bootstrapDatabase(): Promise<void> {
  const connected = await testConnection();
  if (!connected) {
    return;
  }
  try {
    await categoryRepository.seedSystemCategories();
  } catch (error) {
    logger.error('Failed to seed system categories', { error });
  }
}

try {
  app.listen(PORT, () => {
    logger.success(`妙语记账 后端服务已启动 -> http://localhost:${PORT}`);
    void bootstrapDatabase();
  });
} catch (error) {
  logger.error('Failed to start server', { error });
  process.exit(1);
}

export { app };
