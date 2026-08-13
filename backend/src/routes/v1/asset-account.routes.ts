/**
 * @fileoverview 资产账户路由
 * @module routes/v1/asset-account.routes
 */

import { Router } from 'express';
import {
  createAssetAccount,
  createCreditBill,
  deleteAssetAccount,
  getAssetAccountDetail,
  listAssetAccounts,
  listCreditBills,
  recordAssetTransaction,
  repayCreditBill,
} from '../../controllers/asset-account.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const assetAccountRouter = Router();

assetAccountRouter.use(authenticate);

assetAccountRouter.post('/', createAssetAccount);
assetAccountRouter.get('/', listAssetAccounts);
assetAccountRouter.get('/:accountId', getAssetAccountDetail);
assetAccountRouter.post('/:accountId/transactions', recordAssetTransaction);
assetAccountRouter.delete('/:accountId', deleteAssetAccount);
assetAccountRouter.post('/:accountId/credit-bills', createCreditBill);
assetAccountRouter.get('/:accountId/credit-bills', listCreditBills);

/** 挂到 /api/v1 的信用卡账单还款（独立路径） */
const creditBillRouter = Router();
creditBillRouter.use(authenticate);
creditBillRouter.put('/:billId/repay', repayCreditBill);

export { assetAccountRouter, creditBillRouter };
