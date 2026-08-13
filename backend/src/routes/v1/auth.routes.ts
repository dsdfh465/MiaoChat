/**
 * @fileoverview 认证路由，挂载登录接口
 * @module routes/v1/auth.routes
 */

import { Router } from 'express';
import { login } from '../../controllers/auth.controller';

const authRouter = Router();

authRouter.post('/login', login);

export { authRouter };
