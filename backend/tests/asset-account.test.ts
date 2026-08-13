/**
 * @fileoverview 资产账户业务逻辑单元测试
 * @module tests/asset-account
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import { defaultIconForType, summarizeAssets } from '../src/repositories/asset-account.repository';
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
import { AppError } from '../src/utils/app-error';

class InMemoryAssetAccountRepository implements AssetAccountRepository {
  readonly items: AssetAccountRecord[] = [];

  async create(userId: string, input: CreateAssetAccountInput): Promise<AssetAccountRecord> {
    const now = new Date().toISOString();
    const record: AssetAccountRecord = {
      id: randomUUID(),
      user_id: userId,
      name: input.name,
      type: input.type,
      balance: input.balance ?? 0,
      currency: 'CNY',
      icon: input.icon ?? defaultIconForType(input.type),
      is_active: true,
      is_positive: input.type === 'other' ? Boolean(input.is_positive) : true,
      stock_code: input.stock_code ?? null,
      market: input.market ?? null,
      shares: input.shares ?? 0,
      cost_basis: input.cost_basis ?? 0,
      created_at: now,
      updated_at: now,
    };
    this.items.push(record);
    return record;
  }

  async findByUser(userId: string, includeInactive = false): Promise<AssetAccountRecord[]> {
    return this.items.filter(
      (item) => item.user_id === userId && (includeInactive || item.is_active),
    );
  }

  async findById(id: string, userId: string): Promise<AssetAccountRecord | null> {
    return this.items.find((item) => item.id === id && item.user_id === userId) ?? null;
  }

  async updateBalance(
    id: string,
    userId: string,
    newBalance: number,
  ): Promise<AssetAccountRecord> {
    const item = await this.findById(id, userId);
    if (!item) {
      throw new Error('missing');
    }
    item.balance = newBalance;
    item.updated_at = new Date().toISOString();
    return item;
  }

  async updateStockHolding(
    id: string,
    userId: string,
    shares: number,
    costBasis: number,
  ): Promise<AssetAccountRecord> {
    const item = await this.findById(id, userId);
    if (!item) {
      throw new Error('missing');
    }
    item.shares = shares;
    item.cost_basis = costBasis;
    item.updated_at = new Date().toISOString();
    return item;
  }

  async delete(id: string, userId: string): Promise<void> {
    const item = await this.findById(id, userId);
    if (!item) {
      throw new Error('missing');
    }
    item.is_active = false;
    item.updated_at = new Date().toISOString();
  }

  async getTotalAssets(userId: string): Promise<AssetTotals> {
    const list = await this.findByUser(userId, false);
    return summarizeAssets(list);
  }
}

class InMemoryAssetTransactionRepository implements AssetTransactionRepository {
  readonly items: AssetTransactionRecord[] = [];

  async create(input: CreateAssetTransactionInput): Promise<AssetTransactionRecord> {
    const now = new Date().toISOString();
    const record: AssetTransactionRecord = {
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
    this.items.push(record);
    return record;
  }

  async findByAccount(
    accountId: string,
    limit = 20,
    offset = 0,
  ): Promise<AssetTransactionRecord[]> {
    return this.items
      .filter((item) => item.account_id === accountId)
      .slice(offset, offset + limit);
  }

  async findByUser(): Promise<AssetTransactionRecord[]> {
    return this.items;
  }

  async countByAccount(accountId: string): Promise<number> {
    return this.items.filter((item) => item.account_id === accountId).length;
  }
}

class InMemoryCreditCardRepository implements CreditCardRepository {
  readonly items: CreditCardBillRecord[] = [];

  async createBill(
    accountId: string,
    billMonth: string,
    totalAmount: number,
    dueDate: string,
  ): Promise<CreditCardBillRecord> {
    const now = new Date().toISOString();
    const record: CreditCardBillRecord = {
      id: randomUUID(),
      account_id: accountId,
      bill_month: billMonth,
      total_amount: totalAmount,
      paid_amount: 0,
      due_date: dueDate,
      status: 'unpaid',
      created_at: now,
      updated_at: now,
    };
    this.items.push(record);
    return record;
  }

  async findBillsByAccount(accountId: string): Promise<CreditCardBillRecord[]> {
    return this.items.filter((item) => item.account_id === accountId);
  }

  async findBillById(billId: string): Promise<CreditCardBillRecord | null> {
    return this.items.find((item) => item.id === billId) ?? null;
  }

  async updatePaidAmount(billId: string, paidAmount: number): Promise<CreditCardBillRecord> {
    const bill = await this.findBillById(billId);
    if (!bill) {
      throw new AppError(40405, '信用卡账单不存在', 404);
    }
    bill.paid_amount = paidAmount;
    bill.status =
      paidAmount <= 0 ? 'unpaid' : paidAmount >= bill.total_amount ? 'paid' : 'partial';
    bill.updated_at = new Date().toISOString();
    return bill;
  }
}

describe('asset accounts', () => {
  const userId = randomUUID();
  let accounts: InMemoryAssetAccountRepository;
  let transactions: InMemoryAssetTransactionRepository;
  let creditCards: InMemoryCreditCardRepository;
  let service: ReturnType<typeof createAssetAccountService>;

  beforeEach(() => {
    accounts = new InMemoryAssetAccountRepository();
    transactions = new InMemoryAssetTransactionRepository();
    creditCards = new InMemoryCreditCardRepository();
    service = createAssetAccountService(accounts, transactions, creditCards);
  });

  it('creates a deposit account with initial balance', async () => {
    const created = await service.createAccount(userId, {
      name: '招商银行工资卡',
      type: 'deposit',
      initial_balance: 100000,
    });
    assert.equal(created.type, 'deposit');
    assert.equal(created.balance, 100000);
    assert.equal(created.icon, '💳');
  });

  it('creates a credit account', async () => {
    const created = await service.createAccount(userId, {
      name: '招行信用卡',
      type: 'credit',
    });
    assert.equal(created.type, 'credit');
    assert.equal(created.balance, 0);
  });

  it('creates a fund account', async () => {
    const created = await service.createAccount(userId, {
      name: '货币基金',
      type: 'fund',
      initial_balance: 50000,
    });
    assert.equal(created.type, 'fund');
    assert.equal(created.balance, 50000);
    assert.equal(created.icon, '📈');
  });

  it('creates a stock account with stock_code and market', async () => {
    const created = await service.createAccount(userId, {
      name: '茅台',
      type: 'stock',
      stock_code: '600519',
      market: 'A股',
      initial_balance: 100000,
      shares: 100,
      cost_basis: 15000,
    });
    assert.equal(created.stock_code, '600519');
    assert.equal(created.market, 'A股');
    assert.equal(created.shares, 100);
  });

  it('creates an other account with is_positive', async () => {
    const created = await service.createAccount(userId, {
      name: '比特币钱包',
      type: 'other',
      is_positive: true,
      initial_balance: 100000,
    });
    assert.equal(created.type, 'other');
    assert.equal(created.is_positive, true);
  });

  it('rejects other account without is_positive with 40008', async () => {
    await assert.rejects(
      () =>
        service.createAccount(userId, {
          name: '未知资产',
          type: 'other',
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 40008);
        return true;
      },
    );
  });

  it('rejects stock account without stock_code with 40009', async () => {
    await assert.rejects(
      () =>
        service.createAccount(userId, {
          name: '股票仓',
          type: 'stock',
          market: 'A股',
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 40009);
        return true;
      },
    );
  });

  it('computes total assets summary correctly', async () => {
    await service.createAccount(userId, {
      name: '工资卡',
      type: 'deposit',
      initial_balance: 200000,
    });
    const credit = await service.createAccount(userId, {
      name: '信用卡',
      type: 'credit',
    });
    await service.recordTransaction(userId, credit.id, {
      amount: 50000,
      type: 'expense',
    });
    const list = await service.getUserAccounts(userId);
    assert.equal(list.summary.deposit, 200000);
    assert.equal(list.summary.credit, -50000);
    assert.equal(list.total_assets, 150000);
    assert.equal(list.total_assets_yuan, '1500.00');
  });

  it('increases deposit balance on income', async () => {
    const deposit = await service.createAccount(userId, {
      name: '工资卡',
      type: 'deposit',
      initial_balance: 100000,
    });
    const result = await service.recordTransaction(userId, deposit.id, {
      amount: 500000,
      type: 'income',
      category: '工资',
    });
    assert.equal(result.account.balance, 600000);
    assert.equal(result.transaction.type, 'income');
  });

  it('decreases credit balance on expense', async () => {
    const credit = await service.createAccount(userId, {
      name: '信用卡',
      type: 'credit',
    });
    const result = await service.recordTransaction(userId, credit.id, {
      amount: 30000,
      type: 'expense',
      category: '餐饮',
    });
    assert.equal(result.account.balance, -30000);
    assert.equal(result.transaction.amount, -30000);
  });

  it('increases fund balance on interest', async () => {
    const fund = await service.createAccount(userId, {
      name: '基金',
      type: 'fund',
      initial_balance: 100000,
    });
    const result = await service.recordTransaction(userId, fund.id, {
      amount: 10000,
      type: 'interest',
    });
    assert.equal(result.account.balance, 110000);
  });

  it('updates stock holding on buy', async () => {
    const stock = await service.createAccount(userId, {
      name: '茅台',
      type: 'stock',
      stock_code: '600519',
      market: 'A股',
      initial_balance: 200000,
      shares: 0,
      cost_basis: 0,
    });
    const result = await service.recordTransaction(userId, stock.id, {
      amount: 150000,
      type: 'buy',
      shares: 100,
    });
    assert.equal(result.account.balance, 50000);
    assert.equal(result.account.shares, 100);
    assert.equal(result.account.cost_basis, 150000);
  });

  it('updates stock holding on sell', async () => {
    const stock = await service.createAccount(userId, {
      name: '茅台',
      type: 'stock',
      stock_code: '600519',
      market: 'A股',
      initial_balance: 50000,
      shares: 100,
      cost_basis: 150000,
    });
    const result = await service.recordTransaction(userId, stock.id, {
      amount: 80000,
      type: 'sell',
      shares: 50,
    });
    assert.equal(result.account.balance, 130000);
    assert.equal(result.account.shares, 50);
    assert.equal(result.account.cost_basis, 75000);
  });

  it('increases stock balance on dividend', async () => {
    const stock = await service.createAccount(userId, {
      name: '茅台',
      type: 'stock',
      stock_code: '600519',
      market: 'A股',
      initial_balance: 100000,
    });
    const result = await service.recordTransaction(userId, stock.id, {
      amount: 5000,
      type: 'dividend',
    });
    assert.equal(result.account.balance, 105000);
    assert.equal(result.transaction.type, 'dividend');
  });

  it('rejects expense when deposit balance is insufficient with 40006', async () => {
    const deposit = await service.createAccount(userId, {
      name: '工资卡',
      type: 'deposit',
      initial_balance: 1000,
    });
    await assert.rejects(
      () =>
        service.recordTransaction(userId, deposit.id, {
          amount: 5000,
          type: 'expense',
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 40006);
        return true;
      },
    );
  });

  it('rejects deleting account that has transactions with 40901', async () => {
    const deposit = await service.createAccount(userId, {
      name: '工资卡',
      type: 'deposit',
      initial_balance: 100000,
    });
    await service.recordTransaction(userId, deposit.id, {
      amount: 1000,
      type: 'income',
    });
    await assert.rejects(
      () => service.deleteAccount(userId, deposit.id),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 40901);
        return true;
      },
    );
  });

  it('creates a credit card bill', async () => {
    const credit = await service.createAccount(userId, {
      name: '信用卡',
      type: 'credit',
    });
    const bill = await service.createCreditBill(
      userId,
      credit.id,
      '2026-08-01',
      300000,
      '2026-08-25',
    );
    assert.equal(bill.total_amount, 300000);
    assert.equal(bill.status, 'unpaid');
  });

  it('rejects credit bill repayment over remaining with 40007', async () => {
    const credit = await service.createAccount(userId, {
      name: '信用卡',
      type: 'credit',
    });
    const bill = await service.createCreditBill(
      userId,
      credit.id,
      '2026-08-01',
      100000,
      '2026-08-25',
    );
    await assert.rejects(
      () => service.repayCreditBill(userId, bill.id, 150000),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 40007);
        return true;
      },
    );
  });

  it('soft-deletes account without transactions', async () => {
    const deposit = await service.createAccount(userId, {
      name: '空账户',
      type: 'deposit',
    });
    await service.deleteAccount(userId, deposit.id);
    const stored = await accounts.findById(deposit.id, userId);
    assert.equal(stored?.is_active, false);
  });
});
