import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../core/theme/app_theme.dart';

class _Message {
  final String text;
  final bool   isUser;
  final bool   isError;
  const _Message(this.text, {required this.isUser, this.isError = false});
}

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({super.key});
  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final _msgCtrl    = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _sending     = false;

  final List<_Message> _messages = [
    const _Message(
      'Hello! I am your HealthQueue+ assistant 👋\nHow can I help you today?',
      isUser: false,
    ),
  ];

  static const _suggestions = [
    'Queue status', 'Book appointment', 'Operating hours',
    'Departments', 'Cancel appointment', 'Walk-in',
  ];

  @override
  void dispose() { _msgCtrl.dispose(); _scrollCtrl.dispose(); super.dispose(); }

  Future<void> _send([String? overrideText]) async {
    final text = (overrideText ?? _msgCtrl.text).trim();
    if (text.isEmpty || _sending) return;
    _msgCtrl.clear();

    setState(() {
      _messages.add(_Message(text, isUser: true));
      _sending = true;
    });
    _scrollDown();

    try {
      final reply = await ApiService.sendChatMessage(text);
      if (mounted) setState(() => _messages.add(_Message(reply, isUser: false)));
    } catch (e) {
      if (mounted) setState(() => _messages.add(_Message(
        'Sorry, I could not connect to the server. Please try again.',
        isUser: false, isError: true,
      )));
    } finally {
      if (mounted) setState(() => _sending = false);
      _scrollDown();
    }
  }

  void _scrollDown() => Future.delayed(const Duration(milliseconds: 150), () {
    if (_scrollCtrl.hasClients) {
      _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    }
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('HealthQueue+ Assistant'),
        backgroundColor: AppColors.primary, foregroundColor: Colors.white,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 14),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: Colors.green.shade500, borderRadius: BorderRadius.circular(99)),
            child: const Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.circle, size: 7, color: Colors.white),
              SizedBox(width: 5),
              Text('Online', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
            ]),
          ),
        ],
      ),
      body: Column(children: [
        // Quick suggestion chips
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: _suggestions.map((q) => GestureDetector(
              onTap: _sending ? null : () => _send(q),
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(99),
                  border: Border.all(color: AppColors.primary.withOpacity(0.25)),
                ),
                child: Text(q, style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600)),
              ),
            )).toList()),
          ),
        ),

        // Messages list
        Expanded(
          child: _messages.isEmpty
            ? const Center(child: Text('Ask me anything about HealthQueue+',
                style: TextStyle(color: AppColors.textMuted)))
            : ListView.builder(
                controller: _scrollCtrl,
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                itemCount: _messages.length + (_sending ? 1 : 0),
                itemBuilder: (_, i) {
                  // Typing bubble
                  if (i == _messages.length) return Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 6)]),
                      child: Row(mainAxisSize: MainAxisSize.min, children: List.generate(3, (d) => Container(
                        width: 6, height: 6, margin: EdgeInsets.only(right: d < 2 ? 4 : 0),
                        decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                      ))),
                    ),
                  );

                  final msg = _messages[i];
                  return Align(
                    alignment: msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: msg.isError
                          ? const Color(0xFFFEF2F2)
                          : (msg.isUser ? AppColors.primary : Colors.white),
                        borderRadius: BorderRadius.only(
                          topLeft:     const Radius.circular(18),
                          topRight:    const Radius.circular(18),
                          bottomLeft:  Radius.circular(msg.isUser ? 18 : 4),
                          bottomRight: Radius.circular(msg.isUser ? 4 : 18),
                        ),
                        border: msg.isError ? Border.all(color: const Color(0xFFFCA5A5)) : null,
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 6, offset: const Offset(0,2))],
                      ),
                      child: Text(msg.text, style: TextStyle(
                        fontSize: 14, height: 1.45,
                        color: msg.isError
                          ? const Color(0xFF991B1B)
                          : (msg.isUser ? Colors.white : AppColors.textDark),
                      )),
                    ),
                  );
                },
              ),
        ),

        // Input bar
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
          child: Row(children: [
            Expanded(
              child: TextField(
                controller: _msgCtrl,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  hintText: 'Type your message…',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(99), borderSide: BorderSide(color: Colors.grey.shade300)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(99), borderSide: BorderSide(color: Colors.grey.shade300)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(99), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            GestureDetector(
              onTap: _sending ? null : _send,
              child: Container(
                width: 46, height: 46,
                decoration: BoxDecoration(
                  color: _sending ? Colors.grey.shade300 : AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ]),
        ),
      ]),
    );
  }
}
