/**
 * @fileoverview Express Request 扩展，挂载当前登录用户
 * @module types/express
 */

import { UserRecord } from './user.types';

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}

export {};
