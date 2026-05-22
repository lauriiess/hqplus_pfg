import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../core/routes/app_routes.dart';
import '../core/theme/app_theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameCtrl     = TextEditingController();
  final _emailCtrl    = TextEditingController();
  final _phoneCtrl    = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl  = TextEditingController();
  bool _showPassword  = false;
  bool _loading       = false;

  @override
  void dispose() {
    _nameCtrl.dispose(); _emailCtrl.dispose(); _phoneCtrl.dispose();
    _passwordCtrl.dispose(); _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    final name     = _nameCtrl.text.trim();
    final email    = _emailCtrl.text.trim();
    final phone    = _phoneCtrl.text.trim();
    final password = _passwordCtrl.text;
    final confirm  = _confirmCtrl.text;

    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      _showError('Name, email and password are required.');
      return;
    }
    if (password.length < 6) { _showError('Password must be at least 6 characters.'); return; }
    if (password != confirm) { _showError('Passwords do not match.'); return; }

    setState(() => _loading = true);
    try {
      await context.read<AppState>().register(fullName: name, email: email, phone: phone, password: password);
      if (mounted) Navigator.pushReplacementNamed(context, AppRoutes.home);
    } catch (e) {
      if (mounted) _showError(e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.error),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [AppColors.bgTop, AppColors.bgBottom]),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const SizedBox(height: 16),
                Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Expanded(
                      child: Text('Create Account',
                        style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 24, offset: const Offset(0, 8))]),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _field('Full Name', _nameCtrl, Icons.person_outline, TextInputType.name, hint: 'Juan dela Cruz'),
                      const SizedBox(height: 14),
                      _field('Email Address', _emailCtrl, Icons.email_outlined, TextInputType.emailAddress, hint: 'you@email.com'),
                      const SizedBox(height: 14),
                      _field('Phone Number', _phoneCtrl, Icons.phone_outlined, TextInputType.phone, hint: '+63 9XX XXX XXXX'),
                      const SizedBox(height: 14),
                      const Text('Password', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textDark)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _passwordCtrl,
                        obscureText: !_showPassword,
                        decoration: InputDecoration(
                          prefixIcon: const Icon(Icons.lock_outline),
                          hintText: 'At least 6 characters',
                          suffixIcon: IconButton(
                            icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility),
                            onPressed: () => setState(() => _showPassword = !_showPassword),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      _field('Confirm Password', _confirmCtrl, Icons.lock_outline, TextInputType.visiblePassword, obscure: true, hint: 'Re-enter password'),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: _loading ? null : _register,
                        child: _loading
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text('Create Account'),
                      ),
                      const SizedBox(height: 16),
                      Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        const Text('Already have an account? ', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                        GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: const Text('Sign In', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 13)),
                        ),
                      ]),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController ctrl, IconData icon, TextInputType type,
      {String hint = '', bool obscure = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textDark)),
        const SizedBox(height: 8),
        TextField(
          controller: ctrl,
          keyboardType: type,
          obscureText: obscure,
          decoration: InputDecoration(prefixIcon: Icon(icon), hintText: hint),
        ),
      ],
    );
  }
}
