import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/models.dart';
import '../theme/app_theme.dart';
import '../utils/format.dart';
import 'common.dart';

enum MapBasemap { street, satellite }

class MapPoint {
  const MapPoint({
    required this.business,
    required this.lat,
    required this.lng,
  });

  final Business business;
  final double lat;
  final double lng;
}

Future<LatLng?> geocodeAddress(String query) async {
  final q = query.trim();
  if (q.length < 3) return null;
  final uri = Uri.https('nominatim.openstreetmap.org', '/search', {
    'format': 'json',
    'q': q,
    'limit': '1',
  });
  try {
    final res = await http.get(
      uri,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Sanyuj/1.0 (local neighbourhood app; contact@sanyuj.app)',
      },
    );
    if (res.statusCode != 200) return null;
    final rows = jsonDecode(res.body);
    if (rows is! List || rows.isEmpty) return null;
    final hit = rows.first;
    if (hit is! Map) return null;
    final lat = double.tryParse('${hit['lat']}');
    final lng = double.tryParse('${hit['lon']}');
    if (lat == null || lng == null) return null;
    return LatLng(lat, lng);
  } catch (_) {
    return null;
  }
}

Future<List<MapPoint>> resolveMapPoints(List<Business> providers) async {
  final resolved = <MapPoint>[];
  for (final b in providers) {
    if (b.lat != null && b.lng != null) {
      resolved.add(MapPoint(business: b, lat: b.lat!, lng: b.lng!));
      continue;
    }
    final address = b.address?.trim();
    if (address == null || address.isEmpty) continue;
    final hit = await geocodeAddress(address);
    await Future<void>.delayed(const Duration(milliseconds: 1100));
    if (hit != null) {
      resolved.add(MapPoint(business: b, lat: hit.latitude, lng: hit.longitude));
    }
  }
  return resolved;
}

Future<void> showProvidersMap(BuildContext context, List<Business> providers) {
  return showGeneralDialog(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Close map',
    barrierColor: Colors.black54,
    pageBuilder: (ctx, animation, secondaryAnimation) => ProvidersMapSheet(providers: providers),
  );
}

class ProvidersMapSheet extends StatefulWidget {
  const ProvidersMapSheet({super.key, required this.providers});

  final List<Business> providers;

  @override
  State<ProvidersMapSheet> createState() => _ProvidersMapSheetState();
}

class _ProvidersMapSheetState extends State<ProvidersMapSheet> {
  final _mapController = MapController();
  MapBasemap _basemap = MapBasemap.satellite;
  List<MapPoint> _points = [];
  bool _loading = true;
  String _status = 'Locating providers…';
  MapPoint? _selected;

  @override
  void initState() {
    super.initState();
    _resolve();
  }

  Future<void> _resolve() async {
    setState(() {
      _loading = true;
      _status = 'Locating providers…';
    });
    final points = await resolveMapPoints(widget.providers);
    if (!mounted) return;
    setState(() {
      _points = points;
      _loading = false;
      _status = points.isEmpty
          ? 'No provider locations found'
          : '${points.length} provider${points.length == 1 ? '' : 's'} on the map';
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || points.isEmpty) return;
      if (points.length == 1) {
        _mapController.move(LatLng(points.first.lat, points.first.lng), 16);
      } else {
        final bounds = LatLngBounds.fromPoints(
          points.map((p) => LatLng(p.lat, p.lng)).toList(),
        );
        _mapController.fitCamera(
          CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(48)),
        );
      }
    });
  }

  /// Same basemaps as the webapp (Leaflet): OSM street + Esri World Imagery satellite.
  /// CARTO Voyager now requires an API key and shows a watermark without one.
  TileLayer get _tileLayer {
    if (_basemap == MapBasemap.satellite) {
      return TileLayer(
        urlTemplate:
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        userAgentPackageName: 'app.sanyuj',
        maxZoom: 19,
      );
    }
    return TileLayer(
      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      userAgentPackageName: 'app.sanyuj',
      maxZoom: 19,
    );
  }

  Future<void> _call(Business b) async {
    final digits = b.phone?.replaceAll(RegExp(r'\D'), '') ?? '';
    if (digits.isEmpty) return;
    await launchUrl(Uri.parse('tel:$digits'), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final initial = _points.isNotEmpty
        ? LatLng(_points.first.lat, _points.first.lng)
        : const LatLng(20.5937, 78.9629);

    return Material(
      color: AppColors.bgPage,
      child: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
              decoration: BoxDecoration(
                color: Colors.white,
                border: const Border(bottom: BorderSide(color: AppColors.line)),
                boxShadow: AppColors.cardShadow,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.location_on_outlined, size: 12, color: AppColors.inkFaint),
                            const SizedBox(width: 4),
                            Text('MAP VIEW', style: eyebrowStyle(color: AppColors.inkFaint)),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text('Providers near you', style: GoogleFonts.nunito(fontSize: 16, fontWeight: FontWeight.w700)),
                        Text(_status, style: const TextStyle(fontSize: 12, color: AppColors.inkSoft)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(100),
                      border: Border.all(color: AppColors.line),
                    ),
                    child: Row(
                      children: [
                        _BasemapChip(
                          label: 'Map',
                          selected: _basemap == MapBasemap.street,
                          onTap: () => setState(() => _basemap = MapBasemap.street),
                        ),
                        _BasemapChip(
                          label: 'Satellite',
                          selected: _basemap == MapBasemap.satellite,
                          onTap: () => setState(() => _basemap = MapBasemap.satellite),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white,
                      side: const BorderSide(color: AppColors.line),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.close_rounded, size: 18),
                  ),
                ],
              ),
            ),
            Expanded(
              child: Stack(
                children: [
                  FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: initial,
                      initialZoom: _points.isEmpty ? 5 : 14,
                      onTap: (tapPosition, point) => setState(() => _selected = null),
                    ),
                    children: [
                      _tileLayer,
                      RichAttributionWidget(
                        attributions: [
                          if (_basemap == MapBasemap.street)
                            const TextSourceAttribution('© OpenStreetMap contributors')
                          else
                            const TextSourceAttribution('Tiles © Esri'),
                        ],
                      ),
                      MarkerLayer(
                        markers: [
                          for (final p in _points)
                            Marker(
                              point: LatLng(p.lat, p.lng),
                              width: _selected?.business.id == p.business.id ? 220 : 168,
                              height: _selected?.business.id == p.business.id ? 210 : 56,
                              alignment: Alignment.bottomCenter,
                              child: _MarkerWithTooltip(
                                point: p,
                                selected: _selected?.business.id == p.business.id,
                                onTap: () => setState(() => _selected = p),
                                onCall: () => _call(p.business),
                                onClose: () => setState(() => _selected = null),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                  if (_loading)
                    Container(
                      color: Colors.white70,
                      alignment: Alignment.center,
                      child: const Text(
                        'Locating providers on the map…',
                        style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.inkSoft),
                      ),
                    )
                  else if (_points.isEmpty)
                    Container(
                      color: Colors.white.withValues(alpha: 0.85),
                      alignment: Alignment.center,
                      padding: const EdgeInsets.all(24),
                      child: const Text(
                        'No addresses available to show. Providers need a saved address on their profile.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.inkSoft, height: 1.4),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BasemapChip extends StatelessWidget {
  const _BasemapChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(100),
          boxShadow: selected ? AppColors.cardShadow : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: selected ? AppColors.blueDeep : AppColors.inkSoft,
          ),
        ),
      ),
    );
  }
}

class _MarkerWithTooltip extends StatelessWidget {
  const _MarkerWithTooltip({
    required this.point,
    required this.selected,
    required this.onTap,
    required this.onCall,
    required this.onClose,
  });

  final MapPoint point;
  final bool selected;
  final VoidCallback onTap;
  final VoidCallback onCall;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final b = point.business;
    return Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        if (selected) ...[
          Material(
            color: Colors.transparent,
            child: Container(
              width: 210,
              padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.line),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.ink.withValues(alpha: 0.18),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(b.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        if ((b.providerName ?? '').trim().isNotEmpty)
                          Text(b.providerName!.trim(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        Text(
                          '${b.category?.name ?? 'Provider'} · ${b.rating.toStringAsFixed(1)} ★',
                          style: const TextStyle(fontSize: 11, color: AppColors.inkSoft),
                        ),
                        if (b.phone != null && b.phone!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          GestureDetector(
                            onTap: onCall,
                            child: Text(displayPhone(b.phone!), style: monoStyle(fontSize: 11.5, color: AppColors.blueDeep)),
                          ),
                        ],
                        if ((b.address ?? '').isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            b.address!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 10.5, color: AppColors.inkFaint, height: 1.3),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Column(
                    children: [
                      if (b.phone != null && b.phone!.isNotEmpty)
                        IconButton(
                          onPressed: onCall,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                          icon: const Icon(Icons.phone_rounded, size: 18, color: AppColors.blueDeep),
                        ),
                      IconButton(
                        onPressed: onClose,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                        icon: const Icon(Icons.close_rounded, size: 16, color: AppColors.inkFaint),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          CustomPaint(size: const Size(14, 8), painter: _PinTailPainter()),
          const SizedBox(height: 4),
        ],
        GestureDetector(
          onTap: onTap,
          child: _ProviderPin(
            name: b.name,
            category: b.category?.name,
            selected: selected,
          ),
        ),
      ],
    );
  }
}

class _ProviderPin extends StatelessWidget {
  const _ProviderPin({
    required this.name,
    this.category,
    this.selected = false,
  });

  final String name;
  final String? category;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final short = name.length > 18 ? '${name.substring(0, 17)}…' : name;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(8, 6, 10, 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: selected ? AppColors.blueDeep : AppColors.line, width: selected ? 1.5 : 1),
            boxShadow: AppColors.cardShadow,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AvatarBadge(
                label: initials(name),
                size: 28,
                radius: 9,
                background: AppColors.blueSoft,
                foreground: AppColors.blueDeep,
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(short, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                    if (category != null && category!.isNotEmpty)
                      Text(category!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 9, color: AppColors.inkSoft)),
                  ],
                ),
              ),
            ],
          ),
        ),
        CustomPaint(size: const Size(12, 8), painter: _PinTailPainter()),
      ],
    );
  }
}

class _PinTailPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final path = ui.Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(path, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
