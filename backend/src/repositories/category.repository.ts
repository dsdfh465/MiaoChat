/**
 * @fileoverview 分类数据访问层，包含系统预设分类种子与按名称查找/创建
 * @module repositories/category.repository
 */

import { getSupabaseClient } from '../config/database';
import { CategoryRecord, CategoryRepository } from '../types/transaction.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

const CATEGORY_COLUMNS = 'id, user_id, name, icon, is_system, created_at';

export const SYSTEM_CATEGORIES: ReadonlyArray<{ name: string; icon: string }> = [
  { name: '餐饮', icon: '🍜' },
  { name: '购物', icon: '🛍️' },
  { name: '交通', icon: '🚇' },
  { name: '娱乐', icon: '🎮' },
  { name: '居住', icon: '🏠' },
  { name: '医疗', icon: '💊' },
  { name: '教育', icon: '📚' },
  { name: '人情', icon: '🧧' },
  { name: '其他', icon: '📌' },
];

/**
 * 将未知行校验为分类记录
 *
 * @param row - Supabase 行数据
 * @returns 分类记录
 */
function toCategoryRecord(row: unknown): CategoryRecord {
  if (typeof row !== 'object' || row === null) {
    throw new AppError(50012, '分类数据格式异常', 500);
  }
  const record = row as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.name !== 'string' ||
    typeof record.icon !== 'string' ||
    typeof record.is_system !== 'boolean' ||
    typeof record.created_at !== 'string'
  ) {
    throw new AppError(50012, '分类数据格式异常', 500);
  }
  if (record.user_id !== null && typeof record.user_id !== 'string') {
    throw new AppError(50012, '分类数据格式异常', 500);
  }
  return {
    id: record.id,
    user_id: record.user_id,
    name: record.name,
    icon: record.icon,
    is_system: record.is_system,
    created_at: record.created_at,
  };
}

export const categoryRepository: CategoryRepository = {
  /**
   * 获取系统预设分类
   *
   * @returns 系统分类列表
   */
  async findSystemCategories(): Promise<CategoryRecord[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('categories')
        .select(CATEGORY_COLUMNS)
        .eq('is_system', true)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Failed to list system categories', { error: error.message });
        throw new AppError(50013, '查询分类失败', 500);
      }
      return (data ?? []).map(toCategoryRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to list system categories', { error });
      throw new AppError(50013, '查询分类失败', 500);
    }
  },

  /**
   * 获取用户自定义分类
   *
   * @param userId - 用户 UUID
   * @returns 用户分类列表
   */
  async findByUser(userId: string): Promise<CategoryRecord[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('categories')
        .select(CATEGORY_COLUMNS)
        .eq('user_id', userId)
        .eq('is_system', false)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to list user categories', { userId, error: error.message });
        throw new AppError(50013, '查询分类失败', 500);
      }
      return (data ?? []).map(toCategoryRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to list user categories', { userId, error });
      throw new AppError(50013, '查询分类失败', 500);
    }
  },

  /**
   * 按 ID 查询分类
   *
   * @param id - 分类 UUID
   * @returns 分类记录，不存在时返回 null
   */
  async findById(id: string): Promise<CategoryRecord | null> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('categories')
        .select(CATEGORY_COLUMNS)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        logger.error('Failed to find category by id', { error: error.message });
        throw new AppError(50013, '查询分类失败', 500);
      }
      if (!data) {
        return null;
      }
      return toCategoryRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to find category by id', { error });
      throw new AppError(50013, '查询分类失败', 500);
    }
  },

  /**
   * 按名称查找分类：先系统预设，再用户自定义；都不存在则创建用户分类
   *
   * @param userId - 用户 UUID
   * @param categoryName - 分类名称
   * @returns 匹配或新建的分类
   */
  async findOrCreate(userId: string, categoryName: string): Promise<CategoryRecord> {
    try {
      const name = categoryName.trim();
      const { data: systemRows, error: systemError } = await getSupabaseClient()
        .from('categories')
        .select(CATEGORY_COLUMNS)
        .eq('is_system', true)
        .eq('name', name)
        .maybeSingle();

      if (systemError) {
        logger.error('Failed to match system category', { error: systemError.message });
        throw new AppError(50013, '查询分类失败', 500);
      }
      if (systemRows) {
        return toCategoryRecord(systemRows);
      }

      const { data: userRows, error: userError } = await getSupabaseClient()
        .from('categories')
        .select(CATEGORY_COLUMNS)
        .eq('user_id', userId)
        .eq('name', name)
        .maybeSingle();

      if (userError) {
        logger.error('Failed to match user category', { userId, error: userError.message });
        throw new AppError(50013, '查询分类失败', 500);
      }
      if (userRows) {
        return toCategoryRecord(userRows);
      }

      const { data: created, error: createError } = await getSupabaseClient()
        .from('categories')
        .insert({
          user_id: userId,
          name,
          icon: '📌',
          is_system: false,
        })
        .select(CATEGORY_COLUMNS)
        .single();

      if (createError || !created) {
        logger.error('Failed to create category', { userId, error: createError?.message });
        throw new AppError(50014, '创建分类失败', 500);
      }
      return toCategoryRecord(created);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to find or create category', { userId, error });
      throw new AppError(50013, '查询分类失败', 500);
    }
  },

  /**
   * 写入系统预设分类（已存在则跳过）
   *
   * @returns void
   */
  async seedSystemCategories(): Promise<void> {
    try {
      const existing = await categoryRepository.findSystemCategories();
      const existingNames = new Set(existing.map((item) => item.name));
      const missing = SYSTEM_CATEGORIES.filter((item) => !existingNames.has(item.name));
      if (missing.length === 0) {
        return;
      }

      const { error } = await getSupabaseClient().from('categories').insert(
        missing.map((item) => ({
          user_id: null,
          name: item.name,
          icon: item.icon,
          is_system: true,
        })),
      );

      if (error) {
        logger.error('Failed to seed system categories', { error: error.message });
        throw new AppError(50015, '初始化系统分类失败', 500);
      }
      logger.info('System categories seeded', { count: missing.length });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to seed system categories', { error });
      throw new AppError(50015, '初始化系统分类失败', 500);
    }
  },
};
