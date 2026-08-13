/**
 * @fileoverview 账目路由，挂载交易 CRUD 与月度汇总
 * @module routes/v1/transaction.routes
 */

import { Router } from 'express';
import {
  createTransaction,
  deleteTransaction,
  getMonthlySummary,
  getTransaction,
  listTransactions,
  updateTransaction,
} from '../../controllers/transaction.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const transactionRouter = Router();

transactionRouter.use(authenticate);
transactionRouter.post('/', createTransaction);
transactionRouter.get('/', listTransactions);
transactionRouter.get('/summary/monthly', getMonthlySummary);
transactionRouter.get('/:id', getTransaction);
transactionRouter.put('/:id', updateTransaction);
transactionRouter.delete('/:id', deleteTransaction);

export { transactionRouter };
