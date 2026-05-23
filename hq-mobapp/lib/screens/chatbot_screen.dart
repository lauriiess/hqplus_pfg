import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../state/app_state.dart';
import '../models/chat_models.dart';

class ChatbotScreen extends StatefulWidget {
  final VoidCallback onBookAppointment;
  final VoidCallback onViewQueue;
  const ChatbotScreen({super.key, required this.onBookAppointment, required this.onViewQueue});
  @override State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final _ctrl   = TextEditingController();
  final _scroll = ScrollController();

  @override void initState() {
    super.initState();
    context.read<AppState>().seedChatIfEmpty();
  }
  @override void dispose() { _ctrl.dispose(); _scroll.dispose(); super.dispose(); }

  void _send([String? text]) async {
    final msg = (text ?? _ctrl.text).trim();
    if (msg.isEmpty) return;
    _ctrl.clear();
    await context.read<AppState>().sendMessage(msg);
    await Future.delayed(const Duration(milliseconds: 100));
    if (_scroll.hasClients) _scroll.animateTo(
      _scroll.position.maxScrollExtent,
      duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
  }

  @override
  Widget build(BuildContext context) {
    final messages = context.watch<AppState>().messages;
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),
      appBar: AppBar(
        backgroundColor: Colors.white, foregroundColor: AppColors.textDark,
        title: Row(children: [
          CircleAvatar(radius: 16, backgroundColor: AppColors.primary.withOpacity(0.12),
            child: const Icon(Icons.smart_toy_outlined, color: AppColors.primary, size: 18)),
          const SizedBox(width: 10),
          const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('AI Health Assistant', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
            Text('Online', style: TextStyle(color: Colors.green, fontSize: 11)),
          ]),
        ])),
      body: Column(children: [
        Expanded(child: ListView.builder(
          controller: _scroll,
          padding: const EdgeInsets.all(16),
          itemCount: messages.length,
          itemBuilder: (_, i) => _Bubble(msg: messages[i],
            onQuickReply: _send,
            onBookAppointment: widget.onBookAppointment,
            onViewQueue: widget.onViewQueue))),
        _InputBar(ctrl: _ctrl, onSend: _send),
      ]),
    );
  }
}

class _Bubble extends StatelessWidget {
  final ChatMessage msg;
  final void Function(String) onQuickReply;
  final VoidCallback onBookAppointment;
  final VoidCallback onViewQueue;
  const _Bubble({required this.msg, required this.onQuickReply,
    required this.onBookAppointment, required this.onViewQueue});

  @override
  Widget build(BuildContext context) {
    final isBot = msg.sender == ChatSender.bot;
    return Column(crossAxisAlignment: isBot ? CrossAxisAlignment.start : CrossAxisAlignment.end, children: [
      Row(
        mainAxisAlignment: isBot ? MainAxisAlignment.start : MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (isBot) ...[
            CircleAvatar(radius: 14, backgroundColor: AppColors.primary.withOpacity(0.12),
              child: const Icon(Icons.smart_toy_outlined, color: AppColors.primary, size: 16)),
            const SizedBox(width: 8),
          ],
          Flexible(child: Container(
            margin: const EdgeInsets.only(bottom: 4),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isBot ? Colors.white : AppColors.primary,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(isBot ? 4 : 16),
                bottomRight: Radius.circular(isBot ? 16 : 4)),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)]),
            child: Text(msg.message,
              style: TextStyle(color: isBot ? AppColors.textDark : Colors.white, fontSize: 14)))),
        ]),
      if (isBot && msg.quickReplies.isNotEmpty) ...[
        const SizedBox(height: 6),
        Wrap(spacing: 8, runSpacing: 6,
          children: msg.quickReplies.map((r) => GestureDetector(
            onTap: () {
              if (r == 'Book appointment') { onBookAppointment(); return; }
              if (r == 'Check my queue') { onViewQueue(); return; }
              onQuickReply(r);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white, borderRadius: BorderRadius.circular(99),
                border: Border.all(color: AppColors.primary.withOpacity(0.4))),
              child: Text(r, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 12))))).toList()),
      ],
      const SizedBox(height: 12),
    ]);
  }
}

class _InputBar extends StatelessWidget {
  final TextEditingController ctrl;
  final void Function([String?]) onSend;
  const _InputBar({required this.ctrl, required this.onSend});
  @override
  Widget build(BuildContext context) => Container(
    color: Colors.white,
    padding: const EdgeInsets.fromLTRB(12, 8, 8, 12),
    child: Row(children: [
      Expanded(child: TextField(
        controller: ctrl,
        textInputAction: TextInputAction.send,
        onSubmitted: (_) => onSend(),
        decoration: InputDecoration(
          hintText: 'Ask me anything...',
          filled: true, fillColor: AppColors.fieldFill,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none)))),
      const SizedBox(width: 8),
      GestureDetector(
        onTap: () => onSend(),
        child: Container(width: 44, height: 44,
          decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(22)),
          child: const Icon(Icons.send_rounded, color: Colors.white, size: 20))),
    ]));
}
