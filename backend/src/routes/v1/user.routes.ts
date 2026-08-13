/**
 * @fileoverview 用户画像路由，挂载当前用户信息与人格更新
 * @module routes/v1/user.routes
 */

import { Router } from 'express';
import { getCurrentUser, updatePersonality } from '../../controllers/user.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const userRouter = Router();

userRouter.use(authenticate);
userRouter.get('/me', getCurrentUser);
userRouter.put('/personality', updatePersonality);

export { userRouter };
