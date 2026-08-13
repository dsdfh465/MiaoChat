/**
 * @fileoverview 交易 CSV 导出单元测试：全量、按月筛选、空结果与 UTF-8 BOM
 * @module tests/export
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, beforeEach } from 'node:test';
import {
  CSV_BOM,
  CSV_HEADER,
  createExportService,
  escapeCsvField,
} from '../src/services/export.service';
import {
  CreateTransactionInput,
  MonthlySummary,
  TransactionQuery,
  TransactionRecord,
  TransactionRepository,
  UpdateTransactionData,
} from '../src/types/transaction.types';
import { getMonthRange } from '../src/utils/month-range';

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

  async getCategoryTotalByMonth(): Promise<{ total: number; count: number }> {
    return { total: 0, count: 0 };
  }

  async getTotalExpenseByMonth(): Promise<number> {
    return 0;
  }
}

describe('transaction csv export', () => {
  const userId = randomUUID();
  const categoryId = randomUUID();
  let repository: InMemoryTransactionRepository;
  let service: ReturnType<typeof createExportService>;

  beforeEach(async () => {
    repository = new InMemoryTransactionRepository();
    service = createExportService(repository);
    await repository.create({
      userId,
      categoryId,
      amount: 2500,
      note: '中午吃面',
      recordedAt: '2026-08-13T12:30:00.000Z',
      source: 'voice',
    });
    await repository.create({
      userId,
      categoryId,
      amount: 300,
      note: '地铁上班',
      recordedAt: '2026-08-13T10:00:00.000Z',
      source: 'voice',
    });
    await repository.create({
      userId,
      categoryId,
      amount: 8800,
      note: '九月聚餐',
      recordedAt: '2026-09-01T18:00:00.000Z',
      source: 'manual',
    });
  });

  it('exports all transactions with BOM and nine columns', async () => {
    const csv = await service.exportTransactionsToCSV(userId, {});

    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.equal(csv.startsWith(CSV_BOM), true);

    const body = csv.slice(1);
    const lines = body.split('\n');
    assert.equal(lines[0], CSV_HEADER);
    assert.equal(lines[0]?.split(',').length, 9);
    assert.equal(lines.length, 4);
    assert.ok(lines[1]?.includes('88.00'));
    assert.ok(lines[2]?.includes('25.00'));
    assert.ok(lines[3]?.includes('3.00'));
    assert.ok(lines[2]?.includes('中午吃面'));
    assert.ok(lines[2]?.includes('已确认'));
    assert.ok(lines[2]?.includes('支出'));
    assert.ok(lines[2]?.includes('2026-08-13 12:30:00'));
  });

  it('exports only the requested month', async () => {
    const csv = await service.exportTransactionsToCSV(userId, { month: '2026-08' });
    const lines = csv.slice(1).split('\n');

    assert.equal(lines.length, 3);
    assert.ok(lines[1]?.includes('25.00'));
    assert.ok(lines[2]?.includes('3.00'));
    assert.equal(csv.includes('九月聚餐'), false);
  });

  it('returns header-only CSV when the month has no transactions', async () => {
    const csv = await service.exportTransactionsToCSV(userId, { month: '2026-01' });

    assert.equal(csv.charCodeAt(0), 0xfeff);
    const lines = csv.slice(1).split('\n');
    assert.equal(lines.length, 1);
    assert.equal(lines[0], CSV_HEADER);
  });

  it('escapes commas and quotes in notes per RFC 4180', () => {
    assert.equal(escapeCsvField('中午吃面'), '中午吃面');
    assert.equal(escapeCsvField('面,加蛋'), '"面,加蛋"');
    assert.equal(escapeCsvField('他说"加辣"'), '"他说""加辣"""');
  });
});
