import 'dart:async';

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Types "Search Category…" then "Search Providers…" character-by-character.
class AnimatedSearchHint extends StatefulWidget {
  const AnimatedSearchHint({
    super.key,
    this.first = 'Search Category…',
    this.second = 'Search Providers…',
    this.pause = const Duration(milliseconds: 1500),
    this.charDelay = const Duration(milliseconds: 55),
    this.style,
  });

  final String first;
  final String second;
  final Duration pause;
  final Duration charDelay;

  /// Should match the host field's text style so the hint sits on the baseline.
  final TextStyle? style;

  @override
  State<AnimatedSearchHint> createState() => _AnimatedSearchHintState();
}

class _AnimatedSearchHintState extends State<AnimatedSearchHint> {
  String _text = '';
  Timer? _timer;
  /// 0 type first, 1 pause, 2 delete first, 3 type second, 4 pause, 5 delete second
  int _phase = 0;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _tick();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _active => _phase <= 2 ? widget.first : widget.second;

  void _schedule(Duration d) {
    _timer?.cancel();
    _timer = Timer(d, _tick);
  }

  void _tick() {
    if (!mounted) return;
    if (_phase == 0 || _phase == 3) {
      if (_index < _active.length) {
        _index++;
        setState(() => _text = _active.substring(0, _index));
        _schedule(widget.charDelay);
      } else {
        _phase = _phase == 0 ? 1 : 4;
        _schedule(widget.pause);
      }
      return;
    }
    if (_phase == 1 || _phase == 4) {
      _phase = _phase == 1 ? 2 : 5;
      _schedule(widget.charDelay);
      return;
    }
    // delete
    if (_index > 0) {
      _index--;
      setState(() => _text = _active.substring(0, _index));
      _schedule(widget.charDelay);
    } else {
      _phase = _phase == 2 ? 3 : 0;
      _schedule(widget.charDelay);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      _text.isEmpty ? ' ' : _text,
      style: widget.style ?? const TextStyle(fontSize: 13.5, color: AppColors.inkFaint),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
  }
}
