/// 用户画像模型。
library;

/// 当前登录用户
class User {
  const User({
    required this.id,
    required this.phone,
    required this.personality,
    required this.createdAt,
  });

  final String id;
  final String phone;

  /// strict / gentle / buddha
  final String personality;
  final DateTime createdAt;

  /// 从 GET /users/me 的 data 构造
  ///
  /// [json] 接口 data
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      phone: json['phone'] as String,
      personality: json['personality'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  /// 人格中文名
  String get personalityLabel {
    switch (personality) {
      case 'strict':
        return '严师';
      case 'buddha':
        return '佛系';
      default:
        return '闺蜜';
    }
  }
}

/// 人格选项展示
class PersonalityOption {
  const PersonalityOption({
    required this.value,
    required this.label,
    required this.description,
  });

  final String value;
  final String label;
  final String description;
}

/// 三个人格选项
const List<PersonalityOption> kPersonalityOptions = <PersonalityOption>[
  PersonalityOption(
    value: 'strict',
    label: '严师',
    description: '毒舌鞭策，适合自律型',
  ),
  PersonalityOption(
    value: 'gentle',
    label: '闺蜜',
    description: '温柔提醒，适合感性型',
  ),
  PersonalityOption(
    value: 'buddha',
    label: '佛系',
    description: '只记录不评价，适合随缘型',
  ),
];
