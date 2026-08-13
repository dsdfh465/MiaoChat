/**
 * @fileoverview 认证业务逻辑：MVP 阶段校验 mock 验证码，并完成登录或自动注册
 * @module services/auth.service
 */

import { userRepository } from '../repositories/user.repository';
import { LoginResult, UserRepository } from '../types/user.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

/** MVP 阶段固定验证码 */
export const MOCK_VERIFICATION_CODE = '123456';

/**
 * 创建认证服务，便于单元测试注入 Repository
 *
 * @param repository - 用户数据访问实现
 * @returns 登录方法
 */
export function createAuthService(repository: UserRepository): {
  login(phone: string, code: string): Promise<LoginResult>;
} {
  return {
    /**
     * 使用手机号与验证码登录；用户不存在时自动注册
     *
     * @param phone - 用户手机号
     * @param code - 短信验证码
     * @returns 用户信息与是否新用户标记
     */
    async login(phone: string, code: string): Promise<LoginResult> {
      try {
        if (code !== MOCK_VERIFICATION_CODE) {
          throw new AppError(40002, '验证码错误', 401);
        }

        const existing = await repository.findByPhone(phone);
        if (existing) {
          logger.info('User logged in', { userId: existing.id, isNewUser: false });
          return {
            user: existing,
            is_new_user: false,
          };
        }

        const created = await repository.createUser(phone);
        logger.info('User logged in', { userId: created.id, isNewUser: true });
        return {
          user: created,
          is_new_user: true,
        };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Login failed', { error });
        throw new AppError(50006, '登录失败', 500);
      }
    },
  };
}

export const authService = createAuthService(userRepository);
