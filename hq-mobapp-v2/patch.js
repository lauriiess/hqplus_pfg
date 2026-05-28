const fs = require('fs');
let t = fs.readFileSync('lib/screens/dashboard_screen.dart', 'utf8');

// 1. Change the height in the SizedBox wrapping _NearbyClinicsWidget
t = t.replace(
  /const SizedBox\(\s*height: 300,\s*child: _NearbyClinicsWidget\(\),\s*\),/,
  'const SizedBox(\n                      height: 420,\n                      child: _NearbyClinicsWidget(),\n                    ),'
);

// 2. Change the return value of _NearbyClinicsWidgetState's build method
let oldBuildStr =     return FlutterMap(
      options: MapOptions(
        initialCenter: _currentPosition!,
        initialZoom: 14.0,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.example.hq_mobapp',
        ),
        MarkerLayer(
          markers: [
            Marker(
              point: _currentPosition!,
              width: 80,
              height: 80,
              child: const Icon(Icons.my_location, color: Colors.blue, size: 40),
            ),
            ..._clinics.where((c) => c.latitude != null && c.longitude != null).map((c) => Marker(
              point: LatLng(c.latitude!, c.longitude!),
              width: 80,
              height: 80,
              child: const Icon(Icons.local_hospital, color: Colors.red, size: 40),
            )),
          ],
        ),
      ],
    );;

let newBuildStr =     return Column(
      children: [
        Expanded(
          child: FlutterMap(
            options: MapOptions(
              initialCenter: _currentPosition!,
              initialZoom: 14.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.hq_mobapp',
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _currentPosition!,
                    width: 80,
                    height: 80,
                    child: const Icon(Icons.my_location, color: Colors.blue, size: 40),
                  ),
                  ..._clinics.where((c) => c.latitude != null && c.longitude != null).map((c) => Marker(
                    point: LatLng(c.latitude!, c.longitude!),
                    width: 80,
                    height: 80,
                    child: const Icon(Icons.local_hospital, color: Colors.red, size: 40),
                  )),
                ],
              ),
            ],
          ),
        ),
        if (_clinics.isNotEmpty)
          Container(
            height: 120,
            margin: const EdgeInsets.only(top: 10),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _clinics.length,
              itemBuilder: (context, index) {
                final clinic = _clinics[index];
                return Container(
                  width: 200,
                  margin: const EdgeInsets.only(right: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        clinic.name.isNotEmpty ? clinic.name : 'Unknown Clinic',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        clinic.address,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textLight,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const Spacer(),
                      Row(
                        children: [
                          const Icon(Icons.directions_walk, size: 14, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Text(
                            clinic.latitude != null && clinic.longitude != null && _currentPosition != null
                                ? '\ km'
                                : 'N/A',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      )
                    ],
                  ),
                );
              },
            ),
          ),
      ],
    );;

t = t.replace(oldBuildStr, newBuildStr);

fs.writeFileSync('lib/screens/dashboard_screen.dart', t);
console.log("Patched");
