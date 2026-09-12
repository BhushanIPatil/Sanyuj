import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

import '../../config/app_config.dart';
import '../../theme/app_theme.dart';
import '../../widgets/ad_detail_sheet.dart';

class RequestsScreen extends StatefulWidget {
  const RequestsScreen({super.key, this.initialKind});

  final String? initialKind;
  @override
  State<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen> {
  static const _options = [
    (
      'offer',
      'Offer',
      Icons.local_offer_outlined,
      AppColors.blueDeep,
      AppColors.blueSoft,
    ),
    (
      'notice',
      'Notification',
      Icons.notifications_outlined,
      AppColors.indigo,
      AppColors.indigoSoft,
    ),
    (
      'service',
      'Service',
      Icons.home_repair_service_outlined,
      AppColors.greenDeep,
      AppColors.greenSoft,
    ),
  ];
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _contact = TextEditingController();
  final _details = TextEditingController();
  final _scroll = ScrollController();
  String? _kind, _error, _receipt;
  Uint8List? _image;
  String _imageName = '';
  bool _busy = false, _picking = false;

  @override
  void initState() {
    super.initState();
    _kind = _options.any((option) => option.$1 == widget.initialKind)
        ? widget.initialKind
        : null;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      _recoverImage();
    }
  }

  Future<void> _recoverImage() async {
    try {
      final result = await ImagePicker().retrieveLostData();
      if (result.files?.isNotEmpty == true) {
        await _acceptImage(result.files!.first);
      }
    } catch (_) {
      /* The user can select the image again. */
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _contact.dispose();
    _details.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _acceptImage(XFile image) async {
    if (await image.length() > 3 * 1024 * 1024) {
      if (mounted) {
        setState(() => _error = 'Choose an image smaller than 3 MB.');
      }
      return;
    }
    final bytes = await image.readAsBytes();
    if (!mounted) return;
    final jpg =
        bytes.length > 3 &&
        bytes[0] == 255 &&
        bytes[1] == 216 &&
        bytes[2] == 255;
    final png =
        bytes.length > 8 &&
        listEquals(bytes.take(8).toList(), [137, 80, 78, 71, 13, 10, 26, 10]);
    final webp =
        bytes.length > 12 &&
        ascii.decode(bytes.sublist(0, 4), allowInvalid: true) == 'RIFF' &&
        ascii.decode(bytes.sublist(8, 12), allowInvalid: true) == 'WEBP';
    if (!jpg && !png && !webp) {
      setState(() => _error = 'Choose a JPG, PNG or WebP image.');
      return;
    }
    setState(() {
      _image = bytes;
      _imageName = image.name;
      _error = null;
    });
  }

  Future<void> _pickImage() async {
    if (_picking || _busy) return;
    setState(() => _picking = true);
    try {
      final image = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 1800,
        maxHeight: 1800,
        imageQuality: 85,
      );
      if (image != null) await _acceptImage(image);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'Could not open your photos. Please try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _picking = false);
    }
  }

  String? _validateContact(String? input) {
    final value = (input ?? '').trim();
    final digits = value.replaceAll(RegExp(r'\D'), '');
    if (RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value) ||
        (RegExp(r'^\+?[\d\s().-]+$').hasMatch(value) &&
            digits.length >= 8 &&
            digits.length <= 15)) {
      return null;
    }
    return 'Enter a valid phone number or email.';
  }

  Future<void> _submit() async {
    if (_busy ||
        _picking ||
        _kind == null ||
        !(_form.currentState?.validate() ?? false)) {
      return;
    }
    if (_image == null) {
      setState(() => _error = 'Please add an image for your request.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _error = null;
    });
    final client = http.Client();
    try {
      final request =
          http.MultipartRequest(
              'POST',
              Uri.parse('${AppConfig.apiBaseUrl}/api/content-requests'),
            )
            ..fields.addAll({
              'kind': _kind!,
              'name': _name.text.trim(),
              'contact': _contact.text.trim(),
              'details': _details.text.trim(),
            })
            ..files.add(
              http.MultipartFile.fromBytes(
                'image',
                _image!,
                filename: _imageName,
              ),
            );
      final response = await http.Response.fromStream(
        await client.send(request).timeout(const Duration(seconds: 45)),
      ).timeout(const Duration(seconds: 15));
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      if (response.statusCode != 201) {
        throw Exception(
          body['error'] ?? 'Could not submit your request. Please try again.',
        );
      }
      if (!mounted) return;
      setState(() {
        _receipt = body['id'] as String;
        _image = null;
      });
      _name.clear();
      _contact.clear();
      _details.clear();
      if (_scroll.hasClients) _scroll.jumpTo(0);
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e.toString().startsWith('Exception: ')
              ? e.toString().substring(11)
              : 'Check your connection and try again. Your form is still here.',
        );
      }
    } finally {
      client.close();
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _primary(String label, VoidCallback? onPressed) => SizedBox(
    width: double.infinity,
    child: FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.blueDeep,
        padding: const EdgeInsets.symmetric(vertical: 17),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: _busy
          ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            )
          : Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
    ),
  );

  Widget _input(
    String label,
    TextEditingController controller,
    String hint, {
    String? Function(String?)? validator,
    int lines = 1,
    int maxLength = 100,
    List<String>? autofillHints,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 18),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          enabled: !_busy,
          maxLines: lines,
          maxLength: maxLength,
          autofillHints: autofillHints,
          validator: validator,
          textInputAction: lines == 1
              ? TextInputAction.next
              : TextInputAction.newline,
          decoration: InputDecoration(
            hintText: hint,
            counterText: '',
            filled: true,
            fillColor: AppColors.surface,
            contentPadding: const EdgeInsets.all(15),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.line),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.line),
            ),
          ),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    if (_receipt != null) {
      return SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Container(
          margin: const EdgeInsets.only(top: 32),
          padding: const EdgeInsets.all(26),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(26),
            border: Border.all(color: AppColors.line),
            boxShadow: AppColors.cardShadow,
          ),
          child: Column(
            children: [
              const CircleAvatar(
                radius: 38,
                backgroundColor: AppColors.greenSoft,
                child: Icon(
                  Icons.check_circle_outline_rounded,
                  size: 40,
                  color: AppColors.greenDeep,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'REQUEST RECEIVED',
                style: TextStyle(
                  fontSize: 11,
                  letterSpacing: 1.5,
                  color: AppColors.greenDeep,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Thank you for reaching out!',
                textAlign: TextAlign.center,
                style: GoogleFonts.nunito(
                  fontSize: 27,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Our team will review your request and contact you using the details you shared to help add your ${_kind == 'notice' ? 'notification' : _kind} on Sanyuj.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  height: 1.6,
                  color: AppColors.inkSoft,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  'Your request will go live after follow-up and review.\n\nReference: ${_receipt!.substring(0, 8).toUpperCase()}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.5,
                    color: AppColors.inkSoft,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _primary(
                'Submit another request',
                () => setState(() {
                  _receipt = null;
                  _kind = null;
                  _error = null;
                }),
              ),
              TextButton(
                onPressed: () => context.go('/home'),
                child: const Text('Back to Home'),
              ),
            ],
          ),
        ),
      );
    }
    return SingleChildScrollView(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.blueSoft, Colors.white, AppColors.greenSoft],
              ),
              borderRadius: BorderRadius.circular(26),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(
                      Icons.chat_bubble_outline_rounded,
                      size: 16,
                      color: AppColors.blueDeep,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'LET’S GET YOU NOTICED',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1,
                        color: AppColors.blueDeep,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  'Share it with your neighbourhood.',
                  style: GoogleFonts.nunito(
                    fontSize: 29,
                    height: 1.15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'An offer, an update or a service. Send us the details and we’ll get in touch to help you take the next step.',
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.6,
                    color: AppColors.inkSoft,
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  '01  Choose    ·    02  Share    ·    03  We follow up',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.inkSoft,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 26),
          Text(
            'What would you like to share?',
            style: GoogleFonts.nunito(
              fontSize: 17,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (var i = 0; i < _options.length; i++) ...[
                if (i > 0) const SizedBox(width: 8),
                Expanded(
                  child: Semantics(
                    selected: _kind == _options[i].$1,
                    button: true,
                    child: InkWell(
                      onTap: _busy
                          ? null
                          : () => setState(() {
                              _kind = _options[i].$1;
                              _error = null;
                            }),
                      borderRadius: BorderRadius.circular(18),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        padding: const EdgeInsets.symmetric(
                          vertical: 16,
                          horizontal: 4,
                        ),
                        decoration: BoxDecoration(
                          color: _kind == _options[i].$1
                              ? _options[i].$5
                              : Colors.white,
                          border: Border.all(
                            color: _kind == _options[i].$1
                                ? _options[i].$4
                                : AppColors.line,
                            width: _kind == _options[i].$1 ? 1.5 : 1,
                          ),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              _options[i].$3,
                              color: _options[i].$4,
                              size: 25,
                            ),
                            const SizedBox(height: 10),
                            Text(
                              _options[i].$2,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (_kind == null)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Text(
                'Choose an option to get started. No account needed.',
                style: TextStyle(fontSize: 12, color: AppColors.inkSoft),
              ),
            ),
          if (_kind != null)
            Container(
              margin: const EdgeInsets.only(top: 20),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.line),
                boxShadow: AppColors.cardShadow,
              ),
              child: Form(
                key: _form,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'A few details. A personal follow-up.',
                      style: GoogleFonts.nunito(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 22),
                    _input(
                      'Your name *',
                      _name,
                      'Full name',
                      autofillHints: [AutofillHints.name],
                      validator: (v) => (v ?? '').trim().length < 2
                          ? 'Enter your full name.'
                          : null,
                    ),
                    _input(
                      'Phone number or email *',
                      _contact,
                      'Where can we reach you?',
                      maxLength: 150,
                      validator: _validateContact,
                    ),
                    _input(
                      'Tell us a little more (optional)',
                      _details,
                      _kind == 'service'
                          ? 'Your services and the areas you serve…'
                          : _kind == 'offer'
                          ? 'Your offer, business and location…'
                          : 'What’s happening, where and when?',
                      lines: 3,
                      maxLength: 2000,
                    ),
                    const Text(
                      'Add an image *',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'A photo, poster or flyer helps us understand your request.',
                      style: TextStyle(
                        fontSize: 12,
                        height: 1.5,
                        color: AppColors.inkSoft,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_image != null)
                      Stack(
                        children: [
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Image.memory(
                              _image!,
                              height: 180,
                              fit: BoxFit.contain,
                              errorBuilder: (_, _, _) => const SizedBox(
                                height: 100,
                                child: Center(
                                  child: Text('Could not preview this image.'),
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            top: 0,
                            right: 0,
                            child: IconButton(
                              tooltip: 'Remove image',
                              onPressed: _busy
                                  ? null
                                  : () => setState(() => _image = null),
                              icon: const Icon(Icons.close_rounded),
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _busy || _picking ? null : _pickImage,
                        icon: const Icon(Icons.add_photo_alternate_outlined),
                        label: Text(
                          _picking
                              ? 'Opening photos…'
                              : _image == null
                              ? 'Choose an image'
                              : 'Change image',
                        ),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          foregroundColor: AppColors.blueDeep,
                          side: const BorderSide(color: AppColors.line),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ),
                    const Center(
                      child: Text(
                        'JPG, PNG or WebP · Up to 3 MB',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppColors.inkSoft,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          Icons.verified_user_outlined,
                          size: 17,
                          color: AppColors.greenDeep,
                        ),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Your details stay with our team. By submitting, you agree to be contacted about this request.',
                            style: TextStyle(
                              fontSize: 11,
                              height: 1.5,
                              color: AppColors.inkSoft,
                            ),
                          ),
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: () => openCtaUrl(
                        context,
                        AppConfig.privacyUrl,
                        goTo: context.go,
                      ),
                      child: const Text(
                        'Privacy Policy',
                        style: TextStyle(fontSize: 11),
                      ),
                    ),
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: Semantics(
                          liveRegion: true,
                          child: Text(
                            _error!,
                            style: const TextStyle(
                              color: AppColors.rose,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    _primary(
                      _busy ? 'Sending…' : 'Send request',
                      _busy || _picking ? null : _submit,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
