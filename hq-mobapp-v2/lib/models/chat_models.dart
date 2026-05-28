class ChatMessage {
  final String id;
  final ChatSender sender;
  final String message;
  final DateTime timestamp;
  final List<String> quickReplies;

  const ChatMessage({
    required this.id,
    required this.sender,
    required this.message,
    required this.timestamp,
    this.quickReplies = const [],
  });
}

enum ChatSender { bot, user }
