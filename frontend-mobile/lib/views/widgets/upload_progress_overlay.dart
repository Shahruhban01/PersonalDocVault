import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_theme.dart';
import '../../viewmodels/vault_viewmodel.dart';

/// Floating card widget displaying AES encrypting or multipart upload progress.
class UploadProgressOverlay extends StatelessWidget {
  const UploadProgressOverlay({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<VaultViewModel>();

    return Obx(() {
      final status = controller.uploadStatus.value;
      if (status == 'idle') {
        return const SizedBox.shrink();
      }

      String message = '';
      Color statusColor = AppTheme.primaryColor;
      bool showIndicator = true;

      if (status == 'encrypting') {
        message = 'Encrypting ${controller.uploadingFileName.value}...';
      } else if (status == 'uploading') {
        final percent = (controller.uploadProgress.value * 100).toInt();
        message = 'Uploading ${controller.uploadingFileName.value} ($percent%)...';
      } else if (status == 'completed') {
        message = 'Upload Complete';
        statusColor = Colors.green;
        showIndicator = false;
      } else if (status == 'error') {
        message = 'Upload Failed';
        statusColor = Colors.red;
        showIndicator = false;
      }

      return Positioned(
        bottom: 16,
        right: 16,
        left: 16,
        child: Material(
          type: MaterialType.transparency,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.surfaceColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: statusColor.withOpacity(0.3)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black54,
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                if (showIndicator) ...[
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      value: status == 'uploading' ? controller.uploadProgress.value : null,
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(statusColor),
                    ),
                  ),
                  const SizedBox(width: 12),
                ] else ...[
                  Icon(
                    status == 'completed' ? Icons.check_circle_outline : Icons.error_outline,
                    color: statusColor,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Text(
                    message,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    });
  }
}
