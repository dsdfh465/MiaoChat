/**
 * @fileoverview 预算路由，挂载月度预算设定、查询、进度与删除
 * @module routes/v1/budget.routes
 */

import { Router } from 'express';
import {
  deleteBudget,
  getBudgetProgress,
  listBudgets,
  setBudget,
} from '../../controllers/budget.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const budgetRouter = Router();

budgetRouter.use(authenticate);
budgetRouter.post('/', setBudget);
budgetRouter.get('/progress', getBudgetProgress);
budgetRouter.get('/', listBudgets);
budgetRouter.delete('/', deleteBudget);

export { budgetRouter };
