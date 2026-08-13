/**
 * @fileoverview 账目业务逻辑单元测试：创建、查询、更新、删除
 * @module tests/transaction
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, beforeEach } from 'node:test';
import { SYSTEM_CATEGORIES } from '../src/repositories/category.repository';
import {
  createTransactionSchema,
  updateTransactionSchema,
} from '../src/schemas/transaction.schema';
import { createTransactionService } from '../src/services/transaction.service';
import {
  CategoryRecord,
  CategoryRepository,
  CreateTransactionInput,
  MonthlySummary,
  TransactionQuery,
  TransactionRecord,
  TransactionRepository,
  UpdateTransactionData,
} from '../src/types/transaction.types';
import { AppError } from '../src/utils/app-error';
import { getMonthRange } from '../src/utils/month-range';

class InMemoryCategoryRepository implements CategoryRepository {
  private readonly categories: CategoryRecord[] = [];

  constructor() {
    const now = new Date().toISOString();
    for (const item of SYSTEM_CATEGORIES) {
      this.categories.push({
        id: randomUUID(),
        user_id: null,
        name: item.name,
        icon: item.icon,
        is_system: true,
        created_at: now,
      });
    }
  }

  async findSystemCategories(): Promise<CategoryRecord[]> {
    return this.categories.filter((item) => item.is_system);
  }

  async findByUser(userId: string): Promise<CategoryRecord[]> {
    return this.categories.filter((item) => item.user_id === userId && !item.is_system);
  }

  async findOrCreate(userId: string, categoryName: string): Promise<CategoryRecord> {
    const name = categoryName.trim();
    const systemMatch = this.categories.find((item) => item.is_system && item.name === name);
    if (systemMatch) {
      return systemMatch;
    }
    const userMatch = this.categories.find(
      (item) => item.user_id === userId && item.name === name,
    );
    if (userMatch) {
      return userMatch;
    }
    const created: CategoryRecord = {
      id: randomUUID(),
      user_id: userId,
      name,
      icon: '📌',
      is_system: false,
      created_at: new Date().toISOString(),
    };
    this.categories.push(created);
    return created;
  }

  async seedSystemCategories(): Promise<void> {
    return;
  }

  /**
   * 按 ID 查询分类
   *
   * @param id - 分类 UUID
   * @returns 分类或 null
   */
  async findById(id: string): Promise<CategoryRecord | null> {
    return this.categories.find((item) => item.id === id) ?? null;
  }

  /**
   * 按 ID 同步查找分类（仅测试用）
   *
   * @param categoryId - 分类 UUID
   * @returns 分类或 undefined
   */
  lookupById(categoryId: string): CategoryRecord | undefined {
    return this.categories.find((item) => item.id === categoryId);
  }
}

class InMemoryTransactionRepository implements TransactionRepository {
  private readonly items: TransactionRecord[] = [];

  constructor(private readonly categories: InMemoryCategoryRepository) {}

  /**
   * 按分类 ID 补齐名称与图标
   *
   * @param categoryId - 分类 UUID
   * @returns 名称与图标
   */
  private resolveCategory(categoryId: string): { name: string; icon: string } {
    const found = this.categories.lookupById(categoryId);
    return {
      name: found?.name ?? '其他',
      icon: found?.icon ?? '📌',
    };
  }

  async create(input: CreateTransactionInput): Promise<TransactionRecord> {
    const category = this.resolveCategory(input.categoryId);
    const record: TransactionRecord = {
      id: randomUUID(),
      user_id: input.userId,
      category_id: input.categoryId,
      amount: input.amount,
      note: input.note,
      recorded_at: input.recordedAt,
      source: input.source,
      is_confirmed: true,
      created_at: new Date().toISOString(),
      category_name: category.name,
      category_icon: category.icon,
    };
    this.items.push(record);
    return record;
  }

  async findByUser(
    userId: string,
    query: TransactionQuery,
  ): Promise<{ items: TransactionRecord[]; total: number }> {
    let filtered = this.items.filter((item) => item.user_id === userId);
    if (query.month) {
      const range = getMonthRange(query.month);
      filtered = filtered.filter(
        (item) => item.recorded_at >= range.startIso && item.recorded_at < range.endIso,
      );
    }
    if (query.categoryId) {
      filtered = filtered.filter((item) => item.category_id === query.categoryId);
    }
    filtered.sort((left, right) => right.recorded_at.localeCompare(left.recorded_at));
    return {
      items: filtered.slice(query.offset, query.offset + query.limit),
      total: filtered.length,
    };
  }

  async findById(id: string, userId: string): Promise<TransactionRecord | null> {
    return this.items.find((item) => item.id === id && item.user_id === userId) ?? null;
  }

  async update(id: string, userId: string, data: UpdateTransactionData): Promise<TransactionRecord> {
    const index = this.items.findIndex((item) => item.id === id && item.user_id === userId);
    const current = this.items[index];
    if (index < 0 || !current) {
      throw new AppError(40401, '交易不存在', 404);
    }
    const categoryId = data.categoryId ?? current.category_id;
    const category = this.resolveCategory(categoryId);
    const updated: TransactionRecord = {
      ...current,
      category_id: categoryId,
      amount: data.amount ?? current.amount,
      note: data.note ?? current.note,
      is_confirmed: data.isConfirmed ?? current.is_confirmed,
      category_name: category.name,
      category_icon: category.icon,
    };
    this.items[index] = updated;
    return updated;
  }

  async delete(id: string, userId: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id && item.user_id === userId);
    if (index < 0) {
      throw new AppError(40401, '交易不存在', 404);
    }
    this.items.splice(index, 1);
  }

  async getMonthlySummary(userId: string, month: string): Promise<MonthlySummary> {
    const range = getMonthRange(month);
    const rows = this.items.filter(
      (item) =>
        item.user_id === userId &&
        item.recorded_at >= range.startIso &&
        item.recorded_at < range.endIso,
    );
    let totalIncome = 0;
    let totalExpense = 0;
    const breakdownMap = new Map<string, {
      category_name: string;
      category_icon: string;
      total: number;
      count: number;
    }>();
    for (const row of rows) {
      if (row.amount < 0) {
        totalIncome += Math.abs(row.amount);
      } else {
        totalExpense += row.amount;
        const current = breakdownMap.get(row.category_id);
        if (current) {
          current.total += row.amount;
          current.count += 1;
        } else {
          breakdownMap.set(row.category_id, {
            category_name: row.category_name,
            category_icon: row.category_icon,
            total: row.amount,
            count: 1,
          });
        }
      }
    }
    return {
      month,
      total_income: totalIncome,
      total_expense: totalExpense,
      net_amount: totalIncome - totalExpense,
      category_breakdown: [...breakdownMap.values()],
    };
  }

  async getCategoryTotalByMonth(
    userId: string,
    categoryId: string,
    month: string,
  ): Promise<{ total: number; count: number }> {
    const rows = this.listConfirmedExpenses(userId, month, categoryId);
    return {
      total: rows.reduce((sum, item) => sum + item.amount, 0),
      count: rows.length,
    };
  }

  async getTotalExpenseByMonth(userId: string, month: string): Promise<number> {
    const rows = this.listConfirmedExpenses(userId, month);
    return rows.reduce((sum, item) => sum + item.amount, 0);
  }

  /**
   * 筛选已确认的正数支出
   *
   * @param userId - 用户 UUID
   * @param month - YYYY-MM
   * @param categoryId - 可选分类
   * @returns 交易列表
   */
  private listConfirmedExpenses(
    userId: string,
    month: string,
    categoryId?: string,
  ): TransactionRecord[] {
    const range = getMonthRange(month);
    return this.items.filter(
      (item) =>
        item.user_id === userId &&
        item.is_confirmed &&
        item.amount > 0 &&
        item.recorded_at >= range.startIso &&
        item.recorded_at < range.endIso &&
        (categoryId === undefined || item.category_id === categoryId),
    );
  }
}

describe('transaction service', () => {
  const userId = randomUUID();
  let categories: InMemoryCategoryRepository;
  let transactions: InMemoryTransactionRepository;
  let service: ReturnType<typeof createTransactionService>;

  beforeEach(() => {
    categories = new InMemoryCategoryRepository();
    transactions = new InMemoryTransactionRepository(categories);
    service = createTransactionService(transactions, categories);
  });

  it('creates a transaction with required fields only', async () => {
    const result = await service.createTransaction(userId, {
      amount: 2500,
      category_name: '其他',
    });

    assert.match(result.id, /^[0-9a-f-]{36}$/i);
    assert.equal(result.user_id, userId);
    assert.equal(result.amount, 2500);
    assert.equal(result.amount_yuan, '25.00');
    assert.equal(result.category_name, '其他');
    assert.equal(result.category_icon, '📌');
    assert.equal(result.source, 'voice');
    assert.equal(result.is_confirmed, true);
    assert.equal(result.note, null);
  });

  it('creates a transaction with all fields and auto-creates a custom category', async () => {
    const result = await service.createTransaction(userId, {
      amount: 8800,
      category_name: '加班夜宵',
      note: '公司楼下烧烤',
      recorded_at: '2026-08-13T12:30:00.000Z',
    });

    assert.equal(result.amount, 8800);
    assert.equal(result.amount_yuan, '88.00');
    assert.equal(result.category_name, '加班夜宵');
    assert.equal(result.note, '公司楼下烧烤');
    assert.equal(result.recorded_at, '2026-08-13T12:30:00.000Z');

    const custom = await categories.findByUser(userId);
    assert.equal(custom.length, 1);
    assert.equal(custom[0]?.name, '加班夜宵');
    assert.equal(custom[0]?.is_system, false);
  });

  it('rejects a negative amount with 400', async () => {
    const parsed = createTransactionSchema.safeParse({ amount: -100 });
    assert.equal(parsed.success, false);

    await assert.rejects(
      () => service.createTransaction(userId, { amount: -100, category_name: '餐饮' }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 40001);
        assert.equal(error.message, '金额必须大于0');
        assert.equal(error.httpStatus, 400);
        return true;
      },
    );
  });

  it('lists transactions by month in descending recorded_at order', async () => {
    await service.createTransaction(userId, {
      amount: 1000,
      category_name: '餐饮',
      recorded_at: '2026-08-01T08:00:00.000Z',
    });
    await service.createTransaction(userId, {
      amount: 2000,
      category_name: '交通',
      recorded_at: '2026-08-13T12:30:00.000Z',
    });
    await service.createTransaction(userId, {
      amount: 3000,
      category_name: '购物',
      recorded_at: '2026-07-31T23:59:59.000Z',
    });

    const listed = await service.getUserTransactions(userId, {
      month: '2026-08',
      limit: 20,
      offset: 0,
    });

    assert.equal(listed.pagination.total, 2);
    assert.equal(listed.transactions.length, 2);
    assert.equal(listed.transactions[0]?.amount, 2000);
    assert.equal(listed.transactions[1]?.amount, 1000);
    assert.ok(
      listed.transactions.every((item) => item.recorded_at.startsWith('2026-08')),
    );
  });

  it('updates transaction category', async () => {
    const created = await service.createTransaction(userId, {
      amount: 2500,
      category_name: '餐饮',
    });

    const updated = await service.updateTransaction(userId, created.id, {
      category_name: '娱乐',
    });

    assert.equal(updated.id, created.id);
    assert.equal(updated.category_name, '娱乐');
    assert.equal(updated.category_icon, '🎮');
    assert.equal(updated.amount, 2500);

    const parsed = updateTransactionSchema.safeParse({ category_name: '娱乐' });
    assert.equal(parsed.success, true);
  });

  it('deletes a transaction and subsequent lookup returns 404', async () => {
    const created = await service.createTransaction(userId, {
      amount: 2500,
      category_name: '餐饮',
    });

    await service.deleteTransaction(userId, created.id);

    await assert.rejects(
      () => service.getTransaction(userId, created.id),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 40401);
        assert.equal(error.message, '交易不存在');
        assert.equal(error.httpStatus, 404);
        return true;
      },
    );
  });
});
