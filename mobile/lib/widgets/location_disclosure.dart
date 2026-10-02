import 'package:flutter/material.dart';

/// A dismissed disclosure never authorizes a location lookup.
Future<bool> confirmLocationUse(BuildContext context) async =>
    await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Use your current pincode?'),
        content: const Text(
          'Use your location to find your current pincode and show nearby offers and notices. We only access your location when you choose this option. You can choose an area manually instead.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Not now'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Use current pincode'),
          ),
        ],
      ),
    ) ??
    false;
