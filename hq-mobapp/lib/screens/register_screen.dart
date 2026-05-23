import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../core/routes/app_routes.dart';
import '../state/app_state.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final nameCtrl     = TextEditingController();
  final emailCtrl    = TextEditingController();
  final phoneCtrl    = TextEditingController();
  final passwordCtrl = TextEditingController();
  final confirmCtrl  = TextEditingController();
  bool showPass = false, showConfirm = false;

  @override void dispose() {
    nameCtrl.dispose(); emailCtrl.dispose(); phoneCtrl.dispose();
    passwordCtrl.dispose(); confirmCtrl.dispose(); super.dispose();
  }

  Future<void> _register() async {
    final name  = nameCtrl.text.trim();
    final email = emailCtrl.text.trim();
    final phone = phoneCtrl.text.trim();
    final pass  = passwordCtrl.text;
    final conf  = confirmCtrl.text;

    if (name.isEmpty || email.isEmpty || pass.isEmpty) {
      _snack('Please fill in all required fields.'); return;
    }
    if (pass != conf) { _snack('Passwords do not match.'); return; }
    if (pass.length < 6) { _snack('Password must be at least 6 characters.'); return; }

    final ok = await context.read<AppState>().register(
      fullName: name, email: email, phone: phone, password: pass);
    if (!mounted) return;
    if (ok) {
      Navigator.pushReplacementNamed(context, AppRoutes.dashboard);
    } else {
      _snack(context.read<AppState>().authError ?? 'Registration failed.');
    }
  }

  void _snack(String msg) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  @override
  Widget build(BuildContext context) {
    final loading = context.watch<AppState>().loading;
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: LinearGradient(
          begin: Alignment.topCenter, end: Alignment.bottomCenter,
          colors: [AppColors.bgTop, AppColors.bgBottom])),
        child: SafeArea(child: Center(child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
          child: Column(children: [
            const SizedBox(height: 10),
            Container(width: 64, height: 64,
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              child: const Icon(Icons.local_hospital_rounded, color: AppColors.primary, size: 30)),
            const SizedBox(height: 10),
            const Text('HealthQueue+', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 26)),
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 24, offset: const Offset(0,10))]),
              padding: const EdgeInsets.all(18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Text('Create Account', textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textDark)),
                const SizedBox(height: 6),
                const Text('Join HealthQueue+ today', textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: 16),
                _field('Full Name *', nameCtrl, Icons.person_outline, 'Juan Dela Cruz'),
                const SizedBox(height: 12),
                _field('Email Address *', emailCtrl, Icons.email_outlined, 'juan@email.com', type: TextInputType.emailAddress),
                const SizedBox(height: 12),
                _field('Phone Number', phoneCtrl, Icons.phone_outlined, '+63 917 123 4567', type: TextInputType.phone),
                const SizedBox(height: 12),
                _passField('Password *', passwordCtrl, showPass, () => setState(() => showPass = !showPass)),
                const SizedBox(height: 12),
                _passField('Confirm Password *', confirmCtrl, showConfirm, () => setState(() => showConfirm = !showConfirm)),
                const SizedBox(height: 18),
                loading
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton(onPressed: _register,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary, foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      child: const Text('Create Account', style: TextStyle(fontWeight: FontWeight.w800))),
                const SizedBox(height: 14),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  const Text('Already have an account? ', style: TextStyle(color: AppColors.textMuted)),
                  TextButton(onPressed: () => Navigator.pop(context),
                    child: const Text('Sign In', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w800))),
                ]),
              ]),
            ),
          ]),
        ))),
      ),
    );
  }

  Widget _field(String label, TextEditingController ctrl, IconData icon, String hint,
      {TextInputType type = TextInputType.text}) => Column(
    crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
      const SizedBox(height: 6),
      TextField(controller: ctrl, keyboardType: type,
        decoration: InputDecoration(prefixIcon: Icon(icon), hintText: hint)),
    ]);

  Widget _passField(String label, TextEditingController ctrl, bool show, VoidCallback toggle) =>
    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
      const SizedBox(height: 6),
      TextField(controller: ctrl, obscureText: !show,
        decoration: InputDecoration(
          prefixIcon: const Icon(Icons.lock_outline), hintText: '••••••••',
          suffixIcon: IconButton(icon: Icon(show ? Icons.visibility_off : Icons.visibility), onPressed: toggle))),
    ]);
}
