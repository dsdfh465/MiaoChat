/**
 * @fileoverview 登录业务逻辑单元测试：验证码校验、登录成功、新用户自动注册
 * @module tests/auth
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, beforeEach } from 'node:test';
import { createAuthService, MOCK_VERIFICATION_CODE } from '../src/services/auth.service';
import { AppError } from '../src/utils/app-error';
import { Personality, UserRecord, UserRepository } from '../src/types/user.types';
import { loginSchema } from '../src/schemas/auth.schema';

class InMemoryUserRepository implements UserRepository {
  private readonly usersByPhone = new Map<string, UserRecord>();

  async findByPhone(phone: string): Promise<UserRecord | null> {
    return this.usersByPhone.get(phone) ?? null;
  }

  async findById(userId: string): Promise<UserRecord | null> {
    for (const user of this.usersByPhone.values()) {
      if (user.id === userId) {
        return user;
      }
    }
    return null;
  }

  async createUser(phone: string): Promise<UserRecord> {
    const now = new Date().toISOString();
    const user: UserRecord = {
      id: randomUUID(),
      phone,
      personality: 'gentle',
      created_at: now,
      updated_at: now,
    };
    this.usersByPhone.set(phone, user);
    return user;
  }

  async updatePersonality(userId: string, personality: Personality): Promise<UserRecord> {
    for (const user of this.usersByPhone.values()) {
      if (user.id === userId) {
        const updated: UserRecord = {
          ...user,
          personality,
          updated_at: new Date().toISOString(),
        };
        this.usersByPhone.set(updated.phone, updated);
        return updated;
      }
    }
    throw new Error('user not found');
  }
}

describe('auth login', () => {
  const phone = '13800138000';
  let repository: InMemoryUserRepository;
  let authService: ReturnType<typeof createAuthService>;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    authService = createAuthService(repository);
  });

  it('logs in successfully when verification code is correct', async () => {
    const existing = await repository.createUser(phone);
    const result = await authService.login(phone, MOCK_VERIFICATION_CODE);

    assert.equal(result.is_new_user, false);
    assert.equal(result.user.id, existing.id);
    assert.equal(result.user.personality, 'gentle');
  });

  it('rejects login when verification code is wrong', async () => {
    await assert.rejects(
      () => authService.login(phone, '000000'),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 40002);
        assert.equal(error.message, '验证码错误');
        assert.equal(error.httpStatus, 401);
        return true;
      },
    );
    assert.equal(await repository.findByPhone(phone), null);
  });

  it('auto-registers a new user on first login', async () => {
    const result = await authService.login(phone, MOCK_VERIFICATION_CODE);

    assert.equal(result.is_new_user, true);
    assert.equal(result.user.phone, phone);
    assert.equal(result.user.personality, 'gentle');
    assert.match(result.user.id, /^[0-9a-f-]{36}$/i);

    const stored = await repository.findByPhone(phone);
    assert.ok(stored);
    assert.equal(stored.id, result.user.id);
  });

  it('rejects invalid phone payload via zod schema', () => {
    const parsed = loginSchema.safeParse({ phone: '123', code: '123456' });
    assert.equal(parsed.success, false);
  });
});
