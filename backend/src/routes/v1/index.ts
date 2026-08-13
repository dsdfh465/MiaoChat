/**
 * @fileoverview v1 API 路由汇总
 * @module routes/v1/index
 */

import { Router } from 'express';
import { authRouter } from './auth.routes';
import { assetAccountRouter, creditBillRouter } from './asset-account.routes';
import { budgetRouter } from './budget.routes';
import { exportRouter } from './export.routes';
import { transactionRouter } from './transaction.routes';
import { userRouter } from './user.routes';

const v1Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/users', userRouter);
v1Router.use('/transactions', exportRouter);
v1Router.use('/transactions', transactionRouter);
v1Router.use('/budgets', budgetRouter);
v1Router.use('/asset-accounts', assetAccountRouter);
v1Router.use('/credit-bills', creditBillRouter);

export { v1Router };
