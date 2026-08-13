/**
 * @fileoverview 用户表数据访问层，封装与 Supabase users 表的交互
 * @module repositories/user.repository
 */

import { getSupabaseClient } from '../config/database';
import { Personality, UserRecord, UserRepository } from '../types/user.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

const USER_COLUMNS = 'id, phone, personality, created_at, updated_at';

/**
 * 将未知行数据校验为 UserRecord
 *
 * @param row - Supabase 返回的单行数据
 * @returns 用户记录
 */
function toUserRecord(row: unknown): UserRecord {
  if (typeof row !== 'object' || row === null) {
    throw new AppError(50002, '用户数据格式异常', 500);
  }
  const record = row as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.phone !== 'string' ||
    typeof record.personality !== 'string' ||
    typeof record.created_at !== 'string' ||
    typeof record.updated_at !== 'string'
  ) {
    throw new AppError(50002, '用户数据格式异常', 500);
  }
  if (
    record.personality !== 'strict' &&
    record.personality !== 'gentle' &&
    record.personality !== 'buddha'
  ) {
    throw new AppError(50002, '用户数据格式异常', 500);
  }
  return {
    id: record.id,
    phone: record.phone,
    personality: record.personality,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export const userRepository: UserRepository = {
  /**
   * 根据手机号查询用户
   *
   * @param phone - 用户手机号
   * @returns 用户记录，不存在时返回 null
   */
  async findByPhone(phone: string): Promise<UserRecord | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select(USER_COLUMNS)
        .eq('phone', phone)
        .maybeSingle();

      if (error) {
        logger.error('Failed to find user by phone', { error: error.message });
        throw new AppError(50003, '查询用户失败', 500);
      }
      if (!data) {
        return null;
      }
      return toUserRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to find user by phone', { error });
      throw new AppError(50003, '查询用户失败', 500);
    }
  },

  /**
   * 根据用户 ID 查询用户
   *
   * @param userId - 用户 UUID
   * @returns 用户记录，不存在时返回 null
   */
  async findById(userId: string): Promise<UserRecord | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .select(USER_COLUMNS)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to find user by id', { userId, error: error.message });
        throw new AppError(50003, '查询用户失败', 500);
      }
      if (!data) {
        return null;
      }
      return toUserRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to find user by id', { userId, error });
      throw new AppError(50003, '查询用户失败', 500);
    }
  },

  /**
   * 创建新用户，默认人格为 gentle
   *
   * @param phone - 用户手机号
   * @returns 新建的用户记录
   */
  async createUser(phone: string): Promise<UserRecord> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .insert({ phone, personality: 'gentle' })
        .select(USER_COLUMNS)
        .single();

      if (error || !data) {
        logger.error('Failed to create user', { error: error?.message });
        throw new AppError(50004, '创建用户失败', 500);
      }
      const user = toUserRecord(data);
      logger.info('User created', { userId: user.id });
      return user;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to create user', { error });
      throw new AppError(50004, '创建用户失败', 500);
    }
  },

  /**
   * 更新用户人格设置
   *
   * @param userId - 用户 UUID
   * @param personality - 目标人格
   * @returns 更新后的用户记录
   */
  async updatePersonality(userId: string, personality: Personality): Promise<UserRecord> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('users')
        .update({ personality, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select(USER_COLUMNS)
        .single();

      if (error || !data) {
        logger.error('Failed to update personality', { userId, error: error?.message });
        throw new AppError(50005, '更新人格失败', 500);
      }
      return toUserRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to update personality', { userId, error });
      throw new AppError(50005, '更新人格失败', 500);
    }
  },
};
