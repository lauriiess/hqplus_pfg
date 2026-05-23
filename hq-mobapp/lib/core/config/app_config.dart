
/// ─────────────────────────────────────────────────────────────
/// UPDATE THIS before running on a physical device:
///   - Find your PC IP: run `ipconfig` → IPv4 Address (WiFi)
///   - Replace the IP below with your PC's local IP
///   - Make sure your phone and PC are on the SAME WiFi
/// ─────────────────────────────────────────────────────────────
class AppConfig {
  // ✏️  Change this to your PC's local IP when testing on a real device
  static const String baseUrl = 'http://192.168.1.100:4000';

  static const Duration requestTimeout = Duration(seconds: 15);
}
