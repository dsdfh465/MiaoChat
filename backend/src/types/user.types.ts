/**
 * @fileoverview 用户与认证相关 TypeScript 类型
 * @module types/user.types
 */

export type Personality = 'strict' | 'gentle' | 'buddha';

export interface UserRecord {
  id: string;
  phone: string;
  personality: Personality;
  created_at: string;
  updated_at: string;
}

export interface UserRepository {
  findByPhone(phone: string): Promise<UserRecord | null>;
  findById(userId: string): Promise<UserRecord | null>;
  createUser(phone: string): Promise<UserRecord>;
  updatePersonality(userId: string, personality: Personality): Promise<UserRecord>;
}

export interface LoginResult {
  user: UserRecord;
  is_new_user: boolean;
}

export interface UserProfile {
  id: string;
  phone: string;
  personality: Personality;
  created_at: string;
}

export interface UserPersonalityView {
  id: string;
  phone: string;
  personality: Personality;
  updated_at: string;
}

export interface ApiSuccessResponse<T> {
  code: 0;
  message: 'success';
  data: T;
}

export interface ApiErrorResponse {
  code: number;
  message: string;
  data: null;
}
