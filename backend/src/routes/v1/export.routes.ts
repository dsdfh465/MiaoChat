/**
 * @fileoverview 数据导出路由，挂载交易 CSV 导出
 * @module routes/v1/export.routes
 */

import { Router } from 'express';
import { exportTransactions } from '../../controllers/export.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const exportRouter = Router();

exportRouter.use(authenticate);
exportRouter.get('/export', exportTransactions);

export { exportRouter };
