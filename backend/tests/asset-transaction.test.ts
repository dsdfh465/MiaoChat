/**
 * @fileoverview 资产流水仓储辅助行为测试（与账户服务共用内存实现场景）
 * @module tests/asset-transaction
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import { createAssetAccountService } from '../src/services/asset-account.service';
import {
  AssetAccountRecord,
  AssetAccountRepository,
  AssetTotals,
  AssetTransactionRecord,
  AssetTransactionRepository,
  CreateAssetAccountInput,
  CreateAssetTransactionInput,
  CreditCardBillRecord,
  CreditCardRepository,
} from '../src/types/asset-account.types';
import { defaultIconForType, summarizeAssets } from '../src/repositories/asset-account.repository';

class MemoryAccounts implements AssetAccountRepository {
  items: AssetAccountRecord[] = [];
  async create(userId: string, input: CreateAssetAccountInput): Promise<AssetAccountRecord> {
    const now = new Date().toISOString();
    const row: AssetAccountRecord = {
      id: randomUUID(),
      user_id: userId,
      name: input.name,
      type: input.type,
      balance: input.balance ?? 0,
      currency: 'CNY',
      icon: input.icon ?? defaultIconForType(input.type),
      is_active: true,
      is_positive: input.is_positive ?? true,
      stock_code: input.stock_code ?? null,
      market: input.market ?? null,
      shares: input.shares ?? 0,
      cost_basis: input.cost_basis ?? 0,
      created_at: now,
      updated_at: now,
    };
    this.items.push(row);
    return row;
  }
  async findByUser(userId: string): Promise<AssetAccountRecord[]> {
    return this.items.filter((item) => item.user_id === userId && item.is_active);
  }
  async findById(id: string, userId: string): Promise<AssetAccountRecord | null> {
    return this.items.find((item) => item.id === id && item.user_id === userId) ?? null;
  }
  async updateBalance(id: string, userId: string, newBalance: number): Promise<AssetAccountRecord> {
    const item = (await this.findById(id, userId))!;
    item.balance = newBalance;
    return item;
  }
  async updateStockHolding(
    id: string,
    userId: string,
    shares: number,
    costBasis: number,
  ): Promise<AssetAccountRecord> {
    const item = (await this.findById(id, userId))!;
    item.shares = shares;
    item.cost_basis = costBasis;
    return item;
  }
  async delete(id: string, userId: string): Promise<void> {
    const item = (await this.findById(id, userId))!;
    item.is_active = false;
  }
  async getTotalAssets(userId: string): Promise<AssetTotals> {
    return summarizeAssets(await this.findByUser(userId));
  }
}

class MemoryTx implements AssetTransactionRepository {
  items: AssetTransactionRecord[] = [];
  async create(input: CreateAssetTransactionInput): Promise<AssetTransactionRecord> {
    const now = new Date().toISOString();
    const row: AssetTransactionRecord = {
      id: randomUUID(),
      account_id: input.account_id,
      amount: input.amount,
      balance_after: input.balance_after,
      type: input.type,
      category: input.category ?? null,
      note: input.note ?? null,
      happened_at: input.happened_at ?? now,
      created_at: now,
    };
    this.items.push(row);
    return row;
  }
  async findByAccount(accountId: string): Promise<AssetTransactionRecord[]> {
    return this.items.filter((item) => item.account_id === accountId);
  }
  async findByUser(): Promise<AssetTransactionRecord[]> {
    return this.items;
  }
  async countByAccount(accountId: string): Promise<number> {
    return this.items.filter((item) => item.account_id === accountId).length;
  }
}

class MemoryBills implements CreditCardRepository {
  items: CreditCardBillRecord[] = [];
  async createBill(): Promise<CreditCardBillRecord> {
    throw new Error('unused');
  }
  async findBillsByAccount(): Promise<CreditCardBillRecord[]> {
    return [];
  }
  async findBillById(): Promise<CreditCardBillRecord | null> {
    return null;
  }
  async updatePaidAmount(): Promise<CreditCardBillRecord> {
    throw new Error('unused');
  }
}

describe('asset transactions', () => {
  it('persists repayment as positive cash-in for credit debt', async () => {
    const userId = randomUUID();
    const accounts = new MemoryAccounts();
    const txs = new MemoryTx();
    const service = createAssetAccountService(accounts, txs, new MemoryBills());
    const credit = await service.createAccount(userId, {
      name: '信用卡',
      type: 'credit',
    });
    await service.recordTransaction(userId, credit.id, {
      amount: 200000,
      type: 'expense',
    });
    const repaid = await service.recordTransaction(userId, credit.id, {
      amount: 50000,
      type: 'repayment',
    });
    assert.equal(repaid.transaction.amount, 50000);
    assert.equal(repaid.account.balance, -150000);
    assert.equal(txs.items.length, 2);
  });

  it('lists account detail with transaction pagination fields', async () => {
    const userId = randomUUID();
    const accounts = new MemoryAccounts();
    const txs = new MemoryTx();
    const service = createAssetAccountService(accounts, txs, new MemoryBills());
    const deposit = await service.createAccount(userId, {
      name: '工资卡',
      type: 'deposit',
      initial_balance: 10000,
    });
    await service.recordTransaction(userId, deposit.id, {
      amount: 1000,
      type: 'income',
    });
    const detail = await service.getAccountDetail(userId, deposit.id, 20, 0);
    assert.equal(detail.pagination.total, 1);
    assert.equal(detail.transactions.length, 1);
  });
});
