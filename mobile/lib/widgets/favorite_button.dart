import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/favorites.dart';
import '../theme/app_theme.dart';
import 'common.dart';

class FavoriteButton extends ConsumerStatefulWidget {
  const FavoriteButton({super.key, required this.kind, required this.id});

  final String kind;
  final String id;

  @override
  ConsumerState<FavoriteButton> createState() => _FavoriteButtonState();
}

class _FavoriteButtonState extends ConsumerState<FavoriteButton> {
  bool _saving = false;

  @override
  Widget build(BuildContext context) {
    final favorites = ref.watch(favoritesProvider);
    final selected =
        favorites.valueOrNull?.contains(favoriteKey(widget.kind, widget.id)) ??
        false;
    return IconButton(
      tooltip: selected ? 'Remove from favorites' : 'Add to favorites',
      color: AppColors.blueDeep,
      iconSize: 20,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(minWidth: 32, minHeight: 20),
      style: IconButton.styleFrom(tapTargetSize: MaterialTapTargetSize.shrinkWrap),
      isSelected: selected,
      icon: const Icon(Icons.favorite_border_rounded),
      selectedIcon: const Icon(Icons.favorite_rounded),
      onPressed: _saving || favorites.isLoading
          ? null
          : () async {
              setState(() => _saving = true);
              try {
                await ref
                    .read(favoritesProvider.notifier)
                    .toggle(widget.kind, widget.id);
              } catch (_) {
                if (context.mounted) {
                  showAppErrorSnack(
                    context,
                    'Could not save favorite. Please try again.',
                  );
                }
              } finally {
                if (mounted) setState(() => _saving = false);
              }
            },
    );
  }
}

class FavoriteDateRow extends StatelessWidget {
  const FavoriteDateRow({
    super.key,
    required this.when,
    required this.kind,
    required this.id,
    this.style,
  });

  final String when;
  final String kind;
  final String id;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(
          when,
          style:
              style ??
              const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.inkFaint,
              ),
        ),
      ),
      FavoriteButton(kind: kind, id: id),
    ],
  );
}
