import 'package:intl/intl.dart';

String? normalizePhone(String raw) {
  final digits = raw.replaceAll(RegExp(r'\D'), '');
  if (digits.length == 10) return '+91$digits';
  if (digits.length == 12 && digits.startsWith('91')) return '+$digits';
  return null;
}

String digitsFromPhone(String value) {
  final digits = value.replaceAll(RegExp(r'\D'), '');
  if (digits.length == 12 && digits.startsWith('91')) return digits.substring(2);
  return digits.length > 10 ? digits.substring(0, 10) : digits;
}

String displayPhone(String phone) {
  final d = phone.replaceAll(RegExp(r'\D'), '');
  if (d.length == 12 && d.startsWith('91')) {
    return '+91 ${d.substring(2, 7)} ${d.substring(7)}';
  }
  return phone;
}

String initials(String? name) {
  if (name == null || name.trim().isEmpty) return 'U';
  return name
      .trim()
      .split(RegExp(r'\s+'))
      .map((p) => p.isNotEmpty ? p[0] : '')
      .take(2)
      .join()
      .toUpperCase();
}

String timeAgo(DateTime dt) {
  final mins = DateTime.now().difference(dt).inMinutes;
  if (mins < 60) return '${mins.clamp(1, 59)} min ago';
  final hrs = mins ~/ 60;
  if (hrs < 24) return '${hrs}h ago';
  return '${hrs ~/ 24}d ago';
}

String addressWithPincode(String? address, String? pincode) {
  final addr = address?.trim() ?? '';
  final pin = pincode?.trim() ?? '';
  if (addr.isEmpty && pin.isEmpty) return '';
  if (addr.isEmpty) return pin;
  if (pin.isEmpty || addr.contains(pin)) return addr;
  return '$addr, $pin';
}

String locationLabel({String? area, String? locality, String? pincode, String? address}) {
  final colony = area?.trim() ?? '';
  final loc = locality?.trim() ?? '';
  final pin = pincode?.trim() ?? '';
  final addr = address?.trim() ?? '';
  final place = [colony, loc].where((v) => v.isNotEmpty).join(', ');

  if (place.isNotEmpty && pin.isNotEmpty) return '$place, $pin';
  if (place.isNotEmpty) return place;
  if (addr.isNotEmpty) return addressWithPincode(addr, pin);
  return pin;
}

/// True when categories.emoji holds an image URL instead of an emoji character.
bool isCategoryImageUrl(String? value) {
  if (value == null || value.trim().isEmpty) return false;
  return RegExp(r'^(https?:\/\/|\/\/|\/|data:image\/)', caseSensitive: false)
      .hasMatch(value.trim());
}

String formatDateTime(DateTime dt) {
  return DateFormat('d MMM yyyy · h:mm a').format(dt.toLocal());
}

String formatAdDate(DateTime? dt) {
  if (dt == null) return 'Not set';
  return DateFormat('d MMM yyyy').format(dt.toLocal());
}

bool _isMidnight(DateTime d) => d.hour == 0 && d.minute == 0;

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

String _day(DateTime d) => DateFormat('d MMM yyyy').format(d);
String _time(DateTime d) => DateFormat('h:mm a').format(d);

/// Neighbour-facing event/offer window. Empty when neither date is set.
String formatWhenRange(DateTime? startUtc, DateTime? endUtc) {
  final start = startUtc?.toLocal();
  final end = endUtc?.toLocal();
  if (start == null && end == null) return '';

  if (start != null && end != null && _sameDay(start, end)) {
    final showStartTime = !_isMidnight(start);
    final showEndTime = !_isMidnight(end);
    if (!showStartTime && !showEndTime) return 'on ${_day(start)}';
    if (showStartTime && showEndTime) {
      if (start.hour == end.hour && start.minute == end.minute) {
        return 'on ${_day(start)} at ${_time(start)}';
      }
      return 'on ${_day(start)} from ${_time(start)} to ${_time(end)}';
    }
    if (showStartTime) return 'on ${_day(start)} from ${_time(start)}';
    return 'on ${_day(start)} until ${_time(end)}';
  }

  if (start != null && end != null) {
    final left = _isMidnight(start) ? _day(start) : '${_day(start)}, ${_time(start)}';
    final right = _isMidnight(end) ? _day(end) : '${_day(end)}, ${_time(end)}';
    return '$left → $right';
  }

  if (start != null) {
    return _isMidnight(start) ? 'on ${_day(start)}' : 'on ${_day(start)} from ${_time(start)}';
  }
  return _isMidnight(end!) ? 'until ${_day(end)}' : 'until ${_day(end)}, ${_time(end)}';
}
