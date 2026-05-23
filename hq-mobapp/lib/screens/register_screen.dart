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
  final _formKey    = GlobalKey<FormState>();
  final _nameCtrl   = TextEditingController();
  final _emailCtrl  = TextEditingController();
  final _phoneCtrl  = TextEditingController();
  final _passCtrl   = TextEditingController();
  final _confirmCtrl= TextEditingController();
  bool  _obscure    = true;
  bool  _loading    = false;

  @override
  void dispose() {
    _nameCtrl.dispose(); _emailCtrl.dispose();
    _phoneCtrl.dispose(); _passCtrl.dispose(); _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    if (_passCtrl.text != _confirmCtrl.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match'), backgroundColor: AppColors.error));
      return;
    }
    setState(() => _loading = true);
    try {
      await context.read<AppState>().register(
        fullName: _nameCtrl.text.trim(),
        email:    _emailCtrl.text.trim(),
        phone:    _phoneCtrl.text.trim(),
        password: _passCtrl.text.trim(),
      );
      if (mounted) Navigator.pushReplacementNamed(context, AppRoutes.home);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter, end: Alignment.bottomCenter,
            colors: [AppColors.bgTop, AppColors.bgBottom],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Container(
                    width: 64, height: 64,
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18),
                      boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 12)]),
                    child: const Icon(Icons.personal_injury_outlined, color: AppColors.primary, size: 36),
                  ),
                  const SizedBox(height: 16),
                  const Text('Create Account', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white)),
                  const SizedBox(height: 4),
                  Text('Register as a patient', style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.8))),
                  const SizedBox(height: 28),

                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20),
                      boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 20)]),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _field(_nameCtrl,  'Full Name',      Icons.person_outline,    type: TextInputType.name),
                          const SizedBox(height: 14),
                          _field(_emailCtrl, 'Email Address',  Icons.email_outlined,    type: TextInputType.emailAddress,
                            validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null),
                          const SizedBox(height: 14),
                          _field(_phoneCtrl, 'Phone Number',   Icons.phone_outlined,    type: TextInputType.phone),
                          const SizedBox(height: 14),
                          _field(_passCtrl,  'Password',       Icons.lock_outline,      obscure: _obscure,
                            suffix: IconButton(icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                              onPressed: () => setState(() => _obscure = !_obscure)),
                            validator: (v) => (v == null || v.length < 6) ? 'Min 6 characters' : null),
                          const SizedBox(height: 14),
                          _field(_confirmCtrl,'Confirm Password', Icons.lock_outline,
                            obscure: true,
                            validator: (v) => v != _passCtrl.text ? 'Passwords do not match' : null),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: _loading ? null : _register,
                            child: _loading
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Text('Create Account'),
                          ),
                          const SizedBox(height: 14),
                          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                            Text('Already have an account? ', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                            GestureDetector(
                              onTap: () => Navigator.pop(context),
                              child: const Text('Sign In', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary)),
                            ),
                          ]),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, IconData icon, {
    TextInputType type = TextInputType.text,
    bool obscure = false, Widget? suffix,
    String? Function(String?)? validator,
  }) => TextFormField(
    controller: ctrl,
    keyboardType: type,
    obscureText: obscure,
    decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon), suffixIcon: suffix),
    validator: validator ?? (v) => (v == null || v.isEmpty) ? 'Required' : null,
  );
}
