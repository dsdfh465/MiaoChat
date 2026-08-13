/**
 * @fileoverview 用户画像业务逻辑单元测试
 * @module tests/user
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it, beforeEach } from 'node:test';
import { updatePersonalitySchema } from '../src/schemas/user.schema';
import { createUserService } from '../src/services/user.service';
import { Personality, UserRecord, UserRepository } from '../src/types/user.types';
import { AppError } from '../src/utils/app-error';

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
    const existing = await this.findById(userId);
    if (!existing) {
      throw new Error('user not found');
    }
    const updated: UserRecord = {
      ...existing,
      personality,
      updated_at: new Date().toISOString(),
    };
    this.usersByPhone.set(updated.phone, updated);
    return updated;
  }
}

describe('user profile', () => {
  const phone = '13800138000';
  let repository: InMemoryUserRepository;
  let service: ReturnType<typeof createUserService>;
  let userId: string;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    service = createUserService(repository);
    const created = await repository.createUser(phone);
    userId = created.id;
  });

  it('returns the current user profile', async () => {
    const profile = await service.getUserProfile(userId);

    assert.equal(profile.id, userId);
    assert.equal(profile.phone, phone);
    assert.equal(profile.personality, 'gentle');
    assert.ok(profile.created_at);
    assert.equal('updated_at' in profile, false);
  });

  it('updates personality to strict', async () => {
    const updated = await service.updatePersonality(userId, 'strict');

    assert.equal(updated.id, userId);
    assert.equal(updated.phone, phone);
    assert.equal(updated.personality, 'strict');
    assert.ok(updated.updated_at);

    const stored = await repository.findById(userId);
    assert.equal(stored?.personality, 'strict');
  });

  it('rejects invalid personality aggressive with 40003', async () => {
    const parsed = updatePersonalitySchema.safeParse({ personality: 'aggressive' });
    assert.equal(parsed.success, false);

    await assert.rejects(
      () => service.updatePersonality(userId, 'aggressive'),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 40003);
        assert.equal(error.message, '人格值无效，允许值：strict, gentle, buddha');
        assert.equal(error.httpStatus, 400);
        return true;
      },
    );

    const stored = await repository.findById(userId);
    assert.equal(stored?.personality, 'gentle');
  });
});
