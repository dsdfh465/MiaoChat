/**
 * @fileoverview 预算业务逻辑单元测试：设定、UPSERT、进度与删除
 * @module tests/budget
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, beforeEach } from 'node:test';
import { SYSTEM_CATEGORIES } from '../src/repositories/category.repository';
import { setBudgetSchema } from '../src/schemas/budget.schema';
import { createBudgetService } from '../src/services/budget.service';
import {
  BudgetRecord,
  BudgetRepository,
} from '../src/types/budget.types';
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
import { BudgetStatus } from '../src/utils/budget-status';
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

  async findById(id: string): Promise<CategoryRecord | null> {
    return this.categories.find((item) => item.id === id) ?? null;
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
}

class InMemoryTransactionRepository implements TransactionRepository {
  private readonly items: TransactionRecord[] = [];

  async create(input: CreateTransactionInput): Promise<TransactionRecord> {
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
      category_name: '餐饮',
      category_icon: '🍜',
    };
    this.items.push(record);
    return record;
  }

  async findByUser(
    _userId: string,
    _query: TransactionQuery,
  ): Promise<{ items: TransactionRecord[]; total: number }> {
    return { items: [], total: 0 };
  }

  async findById(_id: string, _userId: string): Promise<TransactionRecord | null> {
    return null;
  }

  async update(
    _id: string,
    _userId: string,
    _data: UpdateTransactionData,
  ): Promise<TransactionRecord> {
    throw new Error('not implemented');
  }

  async delete(_id: string, _userId: string): Promise<void> {
    return;
  }

  async getMonthlySummary(_userId: string, month: string): Promise<MonthlySummary> {
    return {
      month,
      total_income: 0,
      total_expense: 0,
      net_amount: 0,
      category_breakdown: [],
    };
  }

  async getCategoryTotalByMonth(
    userId: string,
    categoryId: string,
    month: string,
  ): Promise<{ total: number; count: number }> {
    const rows = this.listConfirmed(userId, month, categoryId);
    return {
      total: rows.reduce((sum, item) => sum + item.amount, 0),
      count: rows.length,
    };
  }

  async getTotalExpenseByMonth(userId: string, month: string): Promise<number> {
    return this.listConfirmed(userId, month).reduce((sum, item) => sum + item.amount, 0);
  }

  /**
   * 写入一笔可指定确认状态的交易（仅测试用）
   *
   * @param input - 创建参数
   * @param isConfirmed - 是否已确认
   * @returns 交易记录
   */
  async insert(
    input: CreateTransactionInput,
    isConfirmed: boolean,
  ): Promise<TransactionRecord> {
    const record = await this.create(input);
    record.is_confirmed = isConfirmed;
    return record;
  }

  /**
   * 筛选已确认正数支出
   *
   * @param userId - 用户 UUID
   * @param month - YYYY-MM
   * @param categoryId - 可选分类
   * @returns 交易列表
   */
  private listConfirmed(
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

class InMemoryBudgetRepository implements BudgetRepository {
  private readonly items: BudgetRecord[] = [];

  constructor(private readonly categories: InMemoryCategoryRepository) {}

  async setBudget(
    userId: string,
    categoryId: string,
    month: string,
    limitAmount: number,
  ): Promise<BudgetRecord> {
    const existing = await this.getBudget(userId, categoryId, month);
    const category = await this.categories.findById(categoryId);
    const now = new Date().toISOString();
    if (existing) {
      existing.limit_amount = limitAmount;
      existing.updated_at = now;
      existing.category_name = category?.name ?? existing.category_name;
      existing.category_icon = category?.icon ?? existing.category_icon;
      return existing;
    }
    const created: BudgetRecord = {
      id: randomUUID(),
      user_id: userId,
      category_id: categoryId,
      category_name: category?.name ?? '其他',
      category_icon: category?.icon ?? '📌',
      month,
      limit_amount: limitAmount,
      created_at: now,
      updated_at: now,
    };
    this.items.push(created);
    return created;
  }

  async getBudget(
    userId: string,
    categoryId: string,
    month: string,
  ): Promise<BudgetRecord | null> {
    return (
      this.items.find(
        (item) =>
          item.user_id === userId &&
          item.category_id === categoryId &&
          item.month === month,
      ) ?? null
    );
  }

  async getUserBudgetsForMonth(userId: string, month: string): Promise<BudgetRecord[]> {
    return this.items.filter((item) => item.user_id === userId && item.month === month);
  }

  async deleteBudget(userId: string, categoryId: string, month: string): Promise<void> {
    const index = this.items.findIndex(
      (item) =>
        item.user_id === userId &&
        item.category_id === categoryId &&
        item.month === month,
    );
    if (index < 0) {
      throw new AppError(40403, '预算不存在', 404);
    }
    this.items.splice(index, 1);
  }
}

describe('budget service', () => {
  const userId = randomUUID();
  const month = '2026-09';
  let categories: InMemoryCategoryRepository;
  let transactions: InMemoryTransactionRepository;
  let budgets: InMemoryBudgetRepository;
  let service: ReturnType<typeof createBudgetService>;
  let diningId: string;
  let funId: string;

  beforeEach(async () => {
    categories = new InMemoryCategoryRepository();
    transactions = new InMemoryTransactionRepository();
    budgets = new InMemoryBudgetRepository(categories);
    service = createBudgetService(budgets, categories, transactions);
    const system = await categories.findSystemCategories();
    const dining = system.find((item) => item.name === '餐饮');
    const fun = system.find((item) => item.name === '娱乐');
    if (!dining || !fun) {
      throw new Error('system categories missing');
    }
    diningId = dining.id;
    funId = fun.id;
  });

  it('creates a new category budget', async () => {
    const result = await service.setBudget(userId, diningId, month, 200000);

    assert.match(result.id, /^[0-9a-f-]{36}$/i);
    assert.equal(result.category_id, diningId);
    assert.equal(result.category_name, '餐饮');
    assert.equal(result.category_icon, '🍜');
    assert.equal(result.month, month);
    assert.equal(result.limit_amount, 200000);
    assert.equal(result.limit_yuan, '2000.00');

    const stored = await budgets.getBudget(userId, diningId, month);
    assert.ok(stored);
    assert.equal(stored.limit_amount, 200000);
  });

  it('updates an existing category budget (UPSERT)', async () => {
    const created = await service.setBudget(userId, diningId, month, 200000);
    const updated = await service.setBudget(userId, diningId, month, 150000);

    assert.equal(updated.id, created.id);
    assert.equal(updated.limit_amount, 150000);
    assert.equal(updated.limit_yuan, '1500.00');

    const listed = await service.getUserBudgets(userId, month);
    assert.equal(listed.budgets.length, 1);
    assert.equal(listed.budgets[0]?.limit_amount, 150000);
  });

  it('lists all budgets for a month', async () => {
    await service.setBudget(userId, diningId, month, 200000);
    await service.setBudget(userId, funId, month, 50000);
    await service.setBudget(userId, diningId, '2026-08', 100000);

    const listed = await service.getUserBudgets(userId, month);
    assert.equal(listed.month, month);
    assert.equal(listed.budgets.length, 2);
    const names = listed.budgets.map((item) => item.category_name).sort();
    assert.deepEqual(names, ['娱乐', '餐饮']);
  });

  it('computes budget progress with confirmed transactions', async () => {
    await service.setBudget(userId, diningId, month, 200000);
    await transactions.create({
      userId,
      categoryId: diningId,
      amount: 32450,
      note: '午饭',
      recordedAt: '2026-09-10T12:00:00.000Z',
      source: 'voice',
    });
    await transactions.insert(
      {
        userId,
        categoryId: diningId,
        amount: 99999,
        note: '未确认草稿',
        recordedAt: '2026-09-11T12:00:00.000Z',
        source: 'voice',
      },
      false,
    );

    const progress = await service.getMonthProgress(userId, month);
    assert.equal(progress.month, month);
    assert.equal(progress.overview.total_budget, 200000);
    assert.equal(progress.overview.total_budget_yuan, '2000.00');
    assert.equal(progress.overview.total_spent, 32450);
    assert.equal(progress.overview.total_spent_yuan, '324.50');
    assert.equal(progress.overview.total_remaining, 167550);
    assert.equal(progress.overview.total_remaining_yuan, '1675.50');
    assert.equal(progress.overview.progress_percentage, 16.2);
    assert.equal(progress.overview.status, BudgetStatus.NORMAL);

    assert.equal(progress.categories.length, 1);
    const dining = progress.categories[0];
    assert.ok(dining);
    assert.equal(dining.spent_amount, 32450);
    assert.equal(dining.spent_yuan, '324.50');
    assert.equal(dining.remaining_amount, 167550);
    assert.equal(dining.remaining_yuan, '1675.50');
    assert.equal(dining.percentage, 16.2);
    assert.equal(dining.status, BudgetStatus.NORMAL);
    assert.equal(dining.limit_yuan, '2000.00');
  });

  it('computes zero progress when there are no transactions', async () => {
    await service.setBudget(userId, diningId, month, 200000);

    const progress = await service.getMonthProgress(userId, month);
    assert.equal(progress.overview.total_spent, 0);
    assert.equal(progress.overview.progress_percentage, 0);
    assert.equal(progress.overview.status, BudgetStatus.NORMAL);
    assert.equal(progress.categories[0]?.spent_amount, 0);
    assert.equal(progress.categories[0]?.percentage, 0);
    assert.equal(progress.categories[0]?.status, BudgetStatus.NORMAL);
  });

  it('deletes a category budget so it no longer appears', async () => {
    await service.setBudget(userId, diningId, month, 200000);
    await service.deleteBudget(userId, diningId, month);

    const listed = await service.getUserBudgets(userId, month);
    assert.equal(listed.budgets.length, 0);
    assert.equal(await budgets.getBudget(userId, diningId, month), null);

    const parsed = setBudgetSchema.safeParse({
      category_id: diningId,
      month,
      limit_amount: -1,
    });
    assert.equal(parsed.success, false);
  });

  it('keeps overview totals aligned with category rows and ignores unbudgeted spend', async () => {
    await service.setBudget(userId, diningId, month, 200000);
    await service.setBudget(userId, funId, month, 50000);
    const shopping = (await categories.findSystemCategories()).find((item) => item.name === '购物');
    assert.ok(shopping);

    await transactions.create({
      userId,
      categoryId: diningId,
      amount: 32450,
      note: '午饭',
      recordedAt: '2026-09-10T12:00:00.000Z',
      source: 'voice',
    });
    await transactions.create({
      userId,
      categoryId: funId,
      amount: 48000,
      note: '电影',
      recordedAt: '2026-09-12T20:00:00.000Z',
      source: 'voice',
    });
    await transactions.create({
      userId,
      categoryId: shopping.id,
      amount: 99900,
      note: '未设预算的购物',
      recordedAt: '2026-09-13T10:00:00.000Z',
      source: 'voice',
    });

    const progress = await service.getMonthProgress(userId, month);
    const categorySpent = progress.categories.reduce((sum, item) => sum + item.spent_amount, 0);
    const categoryRemaining = progress.categories.reduce(
      (sum, item) => sum + item.remaining_amount,
      0,
    );

    assert.equal(progress.overview.total_budget, 250000);
    assert.equal(progress.overview.total_budget_yuan, '2500.00');
    assert.equal(progress.overview.total_spent, 80450);
    assert.equal(progress.overview.total_spent, categorySpent);
    assert.equal(progress.overview.total_remaining, 169550);
    assert.equal(progress.overview.total_remaining, categoryRemaining);
    assert.equal(progress.overview.progress_percentage, 32.2);
    assert.equal(progress.overview.status, BudgetStatus.NORMAL);

    const dining = progress.categories.find((item) => item.category_id === diningId);
    const fun = progress.categories.find((item) => item.category_id === funId);
    assert.ok(dining);
    assert.ok(fun);
    assert.equal(dining.percentage, 16.2);
    assert.equal(dining.status, BudgetStatus.NORMAL);
    assert.equal(fun.percentage, 96);
    assert.equal(fun.status, BudgetStatus.DANGER);
  });

  it('maps warning, danger and exceeded status at the documented thresholds', async () => {
    await service.setBudget(userId, diningId, month, 200000);
    await transactions.create({
      userId,
      categoryId: diningId,
      amount: 140000,
      note: '70%',
      recordedAt: '2026-09-01T00:00:00.000Z',
      source: 'voice',
    });
    let progress = await service.getMonthProgress(userId, month);
    assert.equal(progress.categories[0]?.percentage, 70);
    assert.equal(progress.categories[0]?.status, BudgetStatus.WARNING);
    assert.equal(progress.overview.status, BudgetStatus.WARNING);

    await transactions.create({
      userId,
      categoryId: diningId,
      amount: 40000,
      note: '90%',
      recordedAt: '2026-09-02T00:00:00.000Z',
      source: 'voice',
    });
    progress = await service.getMonthProgress(userId, month);
    assert.equal(progress.categories[0]?.percentage, 90);
    assert.equal(progress.categories[0]?.status, BudgetStatus.DANGER);
    assert.equal(progress.overview.status, BudgetStatus.DANGER);

    await transactions.create({
      userId,
      categoryId: diningId,
      amount: 20000,
      note: '100%',
      recordedAt: '2026-09-03T00:00:00.000Z',
      source: 'voice',
    });
    progress = await service.getMonthProgress(userId, month);
    assert.equal(progress.categories[0]?.percentage, 100);
    assert.equal(progress.categories[0]?.status, BudgetStatus.EXCEEDED);
    assert.equal(progress.overview.status, BudgetStatus.EXCEEDED);
    assert.equal(progress.categories[0]?.remaining_amount, 0);

    await transactions.create({
      userId,
      categoryId: diningId,
      amount: 50000,
      note: '超支',
      recordedAt: '2026-09-04T00:00:00.000Z',
      source: 'voice',
    });
    progress = await service.getMonthProgress(userId, month);
    assert.equal(progress.categories[0]?.percentage, 125);
    assert.equal(progress.categories[0]?.status, BudgetStatus.EXCEEDED);
    assert.equal(progress.categories[0]?.remaining_amount, -50000);
    assert.equal(progress.categories[0]?.remaining_yuan, '-500.00');
    assert.equal(progress.overview.total_remaining, -50000);
  });
});
