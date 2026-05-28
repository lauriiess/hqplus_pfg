const fs = require('fs');
let code = fs.readFileSync('lib/services/api_service.dart', 'utf8');

const newMethods = 
  static Future<Map<String, dynamic>> getMyQueueStatus() async {
    await ensureMockAuth();
    if (_token == null) throw Exception('Auth failed');

    final res = await http.get(
      Uri.parse('\\\/queues/my-status'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer \\\'
      },
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(res.body);
    } else {
      throw Exception('Failed to get queue status: \\\');
    }
  }

  static Future<bool> cancelQueue(String id) async {
    await ensureMockAuth();
    if (_token == null) throw Exception('Auth failed');

    final res = await http.put(
      Uri.parse('\\\/queues/\\\/cancel'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer \\\'
      },
    );

    return res.statusCode == 200 || res.statusCode == 201;
  }
}
;

code = code.replace(/}\n$/, newMethods.replace(/\\\\\\\$/g, '\$'));
fs.writeFileSync('lib/services/api_service.dart', code);
