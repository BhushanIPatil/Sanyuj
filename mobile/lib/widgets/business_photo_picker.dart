import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../theme/app_theme.dart';

class BusinessPhotoPicker extends StatelessWidget {
  const BusinessPhotoPicker({
    super.key,
    this.networkUrl,
    this.localFile,
    this.uploading = false,
    required this.onChanged,
    this.onRemove,
  });

  final String? networkUrl;
  final File? localFile;
  final bool uploading;
  final ValueChanged<XFile> onChanged;
  final VoidCallback? onRemove;

  Future<void> _pick(BuildContext context) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined, color: AppColors.blueDeep),
                title: const Text('Take photo', style: TextStyle(fontWeight: FontWeight.w600)),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: AppColors.blueDeep),
                title: const Text('Choose from gallery', style: TextStyle(fontWeight: FontWeight.w600)),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
              if ((networkUrl != null && networkUrl!.isNotEmpty) || localFile != null)
                ListTile(
                  leading: const Icon(Icons.delete_outline_rounded, color: AppColors.rose),
                  title: const Text('Remove photo', style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.rose)),
                  onTap: () {
                    Navigator.pop(ctx);
                    onRemove?.call();
                  },
                ),
            ],
          ),
        );
      },
    );
    if (source == null) return;
    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, maxWidth: 1200, imageQuality: 85);
    if (file != null) onChanged(file);
  }

  @override
  Widget build(BuildContext context) {
    final hasImage = localFile != null || (networkUrl != null && networkUrl!.trim().isNotEmpty);
    return Column(
      children: [
        GestureDetector(
          onTap: uploading ? null : () => _pick(context),
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  color: AppColors.blueSoft,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: AppColors.blueDeep, width: 2),
                  image: localFile != null
                      ? DecorationImage(image: FileImage(localFile!), fit: BoxFit.cover)
                      : (networkUrl != null && networkUrl!.isNotEmpty
                          ? DecorationImage(image: NetworkImage(networkUrl!), fit: BoxFit.cover)
                          : null),
                ),
                child: hasImage
                    ? null
                    : Center(
                        child: uploading
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.blueDeep),
                              )
                            : Icon(
                                Icons.photo_camera_outlined,
                                color: AppColors.blueDeep,
                                size: 28,
                              ),
                      ),
              ),
              if (uploading && hasImage)
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(28),
                    ),
                    child: const Center(
                      child: SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      ),
                    ),
                  ),
                ),
              Positioned(
                right: -6,
                bottom: -6,
                child: Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: AppColors.blueDeep,
                    borderRadius: BorderRadius.circular(11),
                    border: Border.all(color: Colors.white, width: 3),
                  ),
                  child: Icon(
                    hasImage ? Icons.edit_outlined : Icons.add,
                    color: Colors.white,
                    size: 14,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Text(
          uploading
              ? 'Uploading photo…'
              : hasImage
                  ? 'Change business photo'
                  : 'Add business photo',
          style: const TextStyle(fontSize: 12, color: AppColors.inkSoft, fontWeight: FontWeight.w700),
        ),
      ],
    );
  }
}
