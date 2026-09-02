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

String jobStatusLabel(String status) {
  switch (status) {
    case 'open':
      return 'Open';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
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

String formatAdDate(DateTime? dt) {
  if (dt == null) return 'Not set';
  return DateFormat('d MMM yyyy').format(dt.toLocal());
}
