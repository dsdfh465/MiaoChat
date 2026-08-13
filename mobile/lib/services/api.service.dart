/// Dio 封装：统一鉴权头、超时与错误提示，不在日志中打印手机号。
library;

import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/api_config.dart';
import '../models/asset.model.dart';
import '../models/budget.model.dart';
import '../models/transaction.model.dart';
import '../models/user.model.dart';

/// 业务 API 异常，[message] 可直接展示给用户
class ApiException implements Exception {
  ApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// HTTP API 客户端
class ApiService {
  ApiService({Dio? dio})
      : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: ApiConfig.baseUrl,
                connectTimeout: ApiConfig.timeout,
                receiveTimeout: ApiConfig.timeout,
                sendTimeout: ApiConfig.timeout,
              ),
            );

  final Dio _dio;

  /// 为后续请求设置用户 ID
  ///
  /// [userId] 当前用户 UUID
  void setUserId(String userId) {
    _dio.options.headers['x-user-id'] = userId;
  }

  /// GET /users/me
  ///
  /// [userId] 当前用户
  Future<User> getUserInfo(String userId) async {
    setUserId(userId);
    final Map<String, dynamic> data = await _getJson('/users/me');
    return User.fromJson(data);
  }

  /// PUT /users/personality
  ///
  /// [userId] 当前用户
  /// [personality] strict / gentle / buddha
  Future<User> updatePersonality(String userId, String personality) async {
    setUserId(userId);
    final Response<dynamic> response = await _guard(
      () => _dio.put<dynamic>(
        '/users/personality',
        data: <String, String>{'personality': personality},
      ),
    );
    final Map<String, dynamic> body = _asMap(response.data);
    final Map<String, dynamic> data = _unwrapData(body);
    return User(
      id: data['id'] as String,
      phone: data['phone'] as String,
      personality: data['personality'] as String,
      createdAt: DateTime.tryParse(data['created_at'] as String? ?? '') ??
          DateTime.tryParse(data['updated_at'] as String? ?? '') ??
          DateTime.now(),
    );
  }

  /// GET /transactions
  ///
  /// [userId] 当前用户
  /// [month] 可选 YYYY-MM
  /// [categoryId] 可选分类
  Future<List<Transaction>> getTransactions(
    String userId, {
    String? month,
    String? categoryId,
  }) async {
    setUserId(userId);
    final Map<String, dynamic> data = await _getJson(
      '/transactions',
      query: <String, dynamic>{
        if (month != null) 'month': month,
        if (categoryId != null) 'category_id': categoryId,
        'limit': 100,
        'offset': 0,
      },
    );
    final List<dynamic> list =
        data['transactions'] as List<dynamic>? ?? <dynamic>[];
    return list
        .map(
          (dynamic item) => Transaction.fromJson(item as Map<String, dynamic>),
        )
        .toList();
  }

  /// POST /transactions
  ///
  /// [userId] 当前用户
  /// [params] 金额、分类、备注
  Future<Transaction> createTransaction(
    String userId,
    CreateTransactionParams params,
  ) async {
    setUserId(userId);
    final Response<dynamic> response = await _guard(
      () => _dio.post<dynamic>(
        '/transactions',
        data: <String, dynamic>{
          'amount': params.amount,
          'category_name': params.categoryName,
          if (params.note.isNotEmpty) 'note': params.note,
          if (params.recordedAt != null)
            'recorded_at': params.recordedAt!.toUtc().toIso8601String(),
        },
      ),
    );
    final Map<String, dynamic> body = _asMap(response.data);
    return Transaction.fromJson(_unwrapData(body));
  }

  /// GET /budgets/progress
  ///
  /// [userId] 当前用户
  /// [month] YYYY-MM
  Future<BudgetOverview> getBudgetProgress(
    String userId, {
    required String month,
  }) async {
    setUserId(userId);
    final Map<String, dynamic> data = await _getJson(
      '/budgets/progress',
      query: <String, dynamic>{'month': month},
    );
    return BudgetOverview.fromJson(data);
  }

  /// GET /transactions/export，返回带 BOM 的 CSV 字符串
  ///
  /// [userId] 当前用户
  /// [month] 可选月份
  /// [categoryId] 可选分类
  Future<String> exportTransactions(
    String userId, {
    String? month,
    String? categoryId,
  }) async {
    setUserId(userId);
    final Response<dynamic> response = await _guard(
      () => _dio.get<dynamic>(
        '/transactions/export',
        queryParameters: <String, dynamic>{
          if (month != null) 'month': month,
          if (categoryId != null) 'category_id': categoryId,
        },
        options: Options(responseType: ResponseType.bytes),
      ),
    );
    final Uint8List bytes = Uint8List.fromList(response.data as List<int>);
    return utf8.decode(bytes);
  }

  /// GET /asset-accounts
  ///
  /// [userId] 当前用户
  /// [includeInactive] 是否包含停用账户
  Future<AssetOverview> getAssetOverview(
    String userId, {
    bool includeInactive = false,
  }) async {
    setUserId(userId);
    final Map<String, dynamic> data = await _getJson(
      '/asset-accounts',
      query: <String, dynamic>{
        'include_inactive': includeInactive ? 'true' : 'false',
      },
    );
    return AssetOverview.fromJson(data);
  }

  /// GET /asset-accounts/:id
  ///
  /// [userId] 当前用户
  /// [accountId] 账户 UUID
  Future<Map<String, dynamic>> getAssetAccountDetail(
    String userId,
    String accountId, {
    int limit = 20,
    int offset = 0,
  }) async {
    setUserId(userId);
    return _getJson(
      '/asset-accounts/$accountId',
      query: <String, dynamic>{
        'limit': limit,
        'offset': offset,
      },
    );
  }

  /// POST /asset-accounts/:id/transactions
  ///
  /// [userId] 当前用户
  /// [accountId] 账户 UUID
  /// [amount] 金额（分）
  /// [type] 流水类型
  Future<void> recordAssetTransaction(
    String userId,
    String accountId, {
    required int amount,
    required String type,
    String? category,
    String? note,
    int? shares,
  }) async {
    setUserId(userId);
    await _guard(
      () => _dio.post<dynamic>(
        '/asset-accounts/$accountId/transactions',
        data: <String, dynamic>{
          'amount': amount,
          'type': type,
          if (category != null && category.isNotEmpty) 'category': category,
          if (note != null && note.isNotEmpty) 'note': note,
          if (shares != null) 'shares': shares,
        },
      ),
    );
  }

  Future<Map<String, dynamic>> _getJson(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    final Response<dynamic> response = await _guard(
      () => _dio.get<dynamic>(path, queryParameters: query),
    );
    final Map<String, dynamic> body = _asMap(response.data);
    return _unwrapData(body);
  }

  Future<Response<dynamic>> _guard(
    Future<Response<dynamic>> Function() request,
  ) async {
    try {
      return await request();
    } on DioException catch (error) {
      throw ApiException(_messageFromDio(error));
    }
  }

  String _messageFromDio(DioException error) {
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      return '网络连接较慢，请重试';
    }
    final Response<dynamic>? response = error.response;
    final Object? raw = response?.data;
    final Map<String, dynamic>? payload = _tryParseErrorPayload(raw);
    if (payload != null) {
      final Object? message = payload['message'];
      if (message is String && message.isNotEmpty) {
        return message;
      }
    }
    if (error.type == DioExceptionType.connectionError) {
      return '网络连接较慢，请重试';
    }
    return '网络连接较慢，请重试';
  }

  Map<String, dynamic>? _tryParseErrorPayload(Object? raw) {
    if (raw is Map<String, dynamic>) {
      return raw;
    }
    if (raw is Map) {
      return Map<String, dynamic>.from(raw);
    }
    if (raw is List<int>) {
      try {
        final Object decoded = jsonDecode(utf8.decode(raw));
        if (decoded is Map<String, dynamic>) {
          return decoded;
        }
        if (decoded is Map) {
          return Map<String, dynamic>.from(decoded);
        }
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  Map<String, dynamic> _asMap(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data;
    }
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    throw ApiException('服务器返回格式不正确');
  }

  Map<String, dynamic> _unwrapData(Map<String, dynamic> body) {
    final Object? code = body['code'];
    if (code is int && code != 0) {
      throw ApiException(body['message'] as String? ?? '请求失败');
    }
    final Object? data = body['data'];
    if (data is Map<String, dynamic>) {
      return data;
    }
    if (data is Map) {
      return Map<String, dynamic>.from(data);
    }
    throw ApiException('服务器返回格式不正确');
  }
}

/// 全局 API 客户端
final apiServiceProvider = Provider<ApiService>((Ref ref) {
  return ApiService();
});
