import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:miaochat/models/transaction.model.dart';
import 'package:miaochat/models/user.model.dart';
import 'package:miaochat/services/api.service.dart';

class _MockAdapter implements HttpClientAdapter {
  _MockAdapter(this._handler);

  final ResponseBody Function(RequestOptions options) _handler;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return _handler(options);
  }
}

ResponseBody _json(Map<String, dynamic> body, {int status = 200}) {
  return ResponseBody.fromString(
    jsonEncode(body),
    status,
    headers: <String, List<String>>{
      Headers.contentTypeHeader: <String>[Headers.jsonContentType],
    },
  );
}

void main() {
  test('getUserInfo unwraps success payload', () async {
    final Dio dio = Dio(BaseOptions(baseUrl: 'http://example.test/api/v1'));
    dio.httpClientAdapter = _MockAdapter((RequestOptions options) {
      expect(options.path, '/users/me');
      expect(options.headers['x-user-id'], 'user-1');
      return _json(<String, dynamic>{
        'code': 0,
        'message': 'success',
        'data': <String, dynamic>{
          'id': 'user-1',
          'phone': '13800138000',
          'personality': 'gentle',
          'created_at': '2026-08-13T08:00:00Z',
        },
      });
    });
    final ApiService api = ApiService(dio: dio);
    final User user = await api.getUserInfo('user-1');
    expect(user.phone, '13800138000');
    expect(user.personality, 'gentle');
  });

  test('createTransaction posts amount in fen', () async {
    final Dio dio = Dio(BaseOptions(baseUrl: 'http://example.test/api/v1'));
    dio.httpClientAdapter = _MockAdapter((RequestOptions options) {
      expect(options.method, 'POST');
      expect(options.path, '/transactions');
      final Map<String, dynamic> data = options.data as Map<String, dynamic>;
      expect(data['amount'], 2500);
      expect(data['category_name'], '餐饮');
      return _json(<String, dynamic>{
        'code': 0,
        'message': 'success',
        'data': <String, dynamic>{
          'id': 'tx-1',
          'category_id': 'c1',
          'category_name': '餐饮',
          'category_icon': '🍜',
          'amount': 2500,
          'note': '中午吃面',
          'recorded_at': '2026-08-13T12:30:00Z',
          'source': 'voice',
          'is_confirmed': true,
        },
      });
    });
    final ApiService api = ApiService(dio: dio);
    final tx = await api.createTransaction(
      'user-1',
      const CreateTransactionParams(
        amount: 2500,
        categoryName: '餐饮',
        note: '中午吃面',
      ),
    );
    expect(tx.amount, 2500);
    expect(tx.categoryName, '餐饮');
  });

  test('timeout becomes user-facing toast message', () async {
    final Dio dio = Dio(
      BaseOptions(
        baseUrl: 'http://example.test/api/v1',
        connectTimeout: const Duration(milliseconds: 1),
      ),
    );
    dio.httpClientAdapter = _MockAdapter((RequestOptions options) {
      throw DioException(
        requestOptions: options,
        type: DioExceptionType.connectionTimeout,
      );
    });
    final ApiService api = ApiService(dio: dio);
    expect(
      () => api.getUserInfo('user-1'),
      throwsA(
        isA<ApiException>().having(
          (ApiException e) => e.message,
          'message',
          '网络连接较慢，请重试',
        ),
      ),
    );
  });

  test('4xx message is forwarded to the UI', () async {
    final Dio dio = Dio(BaseOptions(baseUrl: 'http://example.test/api/v1'));
    dio.httpClientAdapter = _MockAdapter((RequestOptions options) {
      return _json(
        <String, dynamic>{
          'code': 40003,
          'message': '人格值无效，允许值：strict, gentle, buddha',
          'data': null,
        },
        status: 400,
      );
    });
    final ApiService api = ApiService(dio: dio);
    expect(
      () => api.updatePersonality('user-1', 'bad'),
      throwsA(
        isA<ApiException>().having(
          (ApiException e) => e.message,
          'message',
          '人格值无效，允许值：strict, gentle, buddha',
        ),
      ),
    );
  });
}
