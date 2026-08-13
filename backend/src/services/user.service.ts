/**
 * @fileoverview 用户画像业务逻辑：查询个人信息与更新人格
 * @module services/user.service
 */

import { userRepository } from '../repositories/user.repository';
import {
  Personality,
  UserPersonalityView,
  UserProfile,
  UserRepository,
} from '../types/user.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

/**
 * 判断字符串是否为合法人格枚举
 *
 * @param value - 待校验值
 * @returns 是否为 strict / gentle / buddha
 */
export function isPersonality(value: string): value is Personality {
  return value === 'strict' || value === 'gentle' || value === 'buddha';
}

/**
 * 创建用户服务，便于单元测试注入 Repository
 *
 * @param repository - 用户数据访问实现
 * @returns 用户画像方法
 */
export function createUserService(repository: UserRepository): {
  getUserProfile(userId: string): Promise<UserProfile>;
  updatePersonality(userId: string, personality: string): Promise<UserPersonalityView>;
} {
  return {
    /**
     * 获取用户个人信息，不返回多余敏感字段
     *
     * @param userId - 用户 UUID
     * @returns 用户画像
     */
    async getUserProfile(userId: string): Promise<UserProfile> {
      try {
        const user = await repository.findById(userId);
        if (!user) {
          throw new AppError(40403, '用户不存在', 404);
        }
        logger.info('User profile fetched', { userId });
        return {
          id: user.id,
          phone: user.phone,
          personality: user.personality,
          created_at: user.created_at,
        };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to get user profile', { userId, error });
        throw new AppError(50003, '查询用户失败', 500);
      }
    },

    /**
     * 更新用户人格设置
     *
     * @param userId - 用户 UUID
     * @param personality - 目标人格
     * @returns 更新后的用户信息
     */
    async updatePersonality(
      userId: string,
      personality: string,
    ): Promise<UserPersonalityView> {
      try {
        if (!isPersonality(personality)) {
          throw new AppError(40003, '人格值无效，允许值：strict, gentle, buddha', 400);
        }
        const existing = await repository.findById(userId);
        if (!existing) {
          throw new AppError(40403, '用户不存在', 404);
        }
        const updated = await repository.updatePersonality(userId, personality);
        logger.info('User personality updated', { userId, personality });
        return {
          id: updated.id,
          phone: updated.phone,
          personality: updated.personality,
          updated_at: updated.updated_at,
        };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to update personality', { userId, error });
        throw new AppError(50005, '更新人格失败', 500);
      }
    },
  };
}

export const userService = createUserService(userRepository);
