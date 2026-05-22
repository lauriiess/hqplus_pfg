import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../services/api_service.dart';

class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime time;
  ChatMessage({required this.text, required this.isUser, DateTime? time})
      : time = time ?? DateTime.now();
}

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({super.key});
  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final _controller = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<ChatMessage> _messages = [];
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _messages.add(ChatMessage(
      text: "Hi! I'm the HealthQueue+ Assistant. Ask me about queue management, booking appointments, clinic recommendations, or anything health-related.",
      isUser: false,
    ));
  }

  @override
  void dispose() { _controller.dispose(); _scrollCtrl.dispose(); super.dispose(); }

  Future<void> _send() async {
    final msg = _controller.text.trim();
    if (msg.isEmpty) return;
    _controller.clear();
    setState(() => _messages.add(ChatMessage(text: msg, isUser: true)));
    _scroll();
    setState(() => _sending = true);
    try {
      final replies = await ApiService.sendChatMessage(msg);
      for (final r in replies) {
        final text = (r as Map<String, dynamic>)['text'] as String? ?? '';
        if (text.isNotEmpty) setState(() => _messages.add(ChatMessage(text: text, isUser: false)));
      }
    } catch (_) {
      setState(() => _messages.add(ChatMessage(text: 'Sorry, I\'m having trouble connecting. Please try again.', isUser: false)));
    } finally {
      setState(() => _sending = false);
      _scroll();
    }
  }

  void _scroll() => Future.delayed(const Duration(milliseconds: 100), () {
    if (_scrollCtrl.hasClients) _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent, duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(children: [
          CircleAvatar(backgroundColor: Colors.white, radius: 16, child: Icon(Icons.smart_toy_outlined, color: AppColors.primary, size: 18)),
          SizedBox(width: 10),
          Text('HQ Assistant'),
        ]),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (_, i) => _bubble(_messages[i]),
            ),
          ),
          if (_sending) const Padding(padding: EdgeInsets.only(left: 16, bottom: 4), child: Row(children: [SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)), SizedBox(width: 8), Text('Thinking...', style: TextStyle(color: AppColors.textMuted, fontSize: 13))])),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Colors.grey.shade200))),
            child: Row(children: [
              Expanded(child: TextField(
                controller: _controller,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: const InputDecoration(hintText: 'Ask me anything...', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10)),
              )),
              const SizedBox(width: 8),
              IconButton(icon: const Icon(Icons.send_rounded, color: AppColors.primary), onPressed: _sending ? null : _send),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _bubble(ChatMessage msg) {
    return Align(
      alignment: msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: msg.isUser ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(16).copyWith(
            bottomRight: msg.isUser ? const Radius.circular(4) : null,
            bottomLeft: msg.isUser ? null : const Radius.circular(4),
          ),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 6)],
        ),
        child: Text(msg.text, style: TextStyle(color: msg.isUser ? Colors.white : AppColors.textDark, fontSize: 14, height: 1.4)),
      ),
    );
  }
}
