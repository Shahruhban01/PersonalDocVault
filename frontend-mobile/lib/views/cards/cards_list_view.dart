import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_theme.dart';
import '../../viewmodels/vault_viewmodel.dart';

/// Screen displaying secure debit/credit cards in a modern visual card wallet.
class CardsListView extends StatelessWidget {
  const CardsListView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<VaultViewModel>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Secure Wallet'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_card_outlined),
            onPressed: () => Get.toNamed('/add-card'),
          ),
        ],
      ),
      body: Obx(() {
        final cards = controller.items.where((x) => x['type'] == 'card').toList();
        if (controller.isLoading.value && cards.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (cards.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.credit_card_outlined, color: Colors.grey, size: 64),
                const SizedBox(height: 16),
                const Text('No secure cards registered.', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  icon: const Icon(Icons.add_outlined),
                  label: const Text('Add Card'),
                  onPressed: () => Get.toNamed('/add-card'),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: cards.length,
          itemBuilder: (context, index) {
            final card = cards[index];
            final brand = (card['cardBrand']?.toString() ?? 'other').toLowerCase();
            final isFavorite = card['isFavorite'] == true;
            final itemId = card['id']?.toString() ?? card['_id']?.toString() ?? '';

            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              child: _buildCardMockup(
                context,
                brand: brand,
                titleJson: card['encryptedTitle'],
                isFavorite: isFavorite,
                onFavoriteToggle: () => controller.toggleFavorite(card),
                onDelete: () => _confirmDelete(context, controller, itemId),
                onReveal: () => _revealCardDetails(context, controller, card),
              ),
            );
          },
        );
      }),
    );
  }

  Widget _buildCardMockup(
    BuildContext context, {
    required String brand,
    required String? titleJson,
    required bool isFavorite,
    required VoidCallback onFavoriteToggle,
    required VoidCallback onDelete,
    required VoidCallback onReveal,
  }) {
    // Custom brand gradients
    Gradient gradient = const LinearGradient(
      colors: [Color(0xFF2C3E50), Color(0xFF000000)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );

    if (brand == 'visa') {
      gradient = const LinearGradient(
        colors: [Color(0xFF0F2027), Color(0xFF203A43), Color(0xFF2C5364)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    } else if (brand == 'mastercard') {
      gradient = const LinearGradient(
        colors: [Color(0xFF8A2387), Color(0xFFE94057), Color(0xFFF27121)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    } else if (brand == 'amex') {
      gradient = const LinearGradient(
        colors: [Color(0xFF11998e), Color(0xFF38ef7d)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    } else if (brand == 'rupay') {
      gradient = const LinearGradient(
        colors: [Color(0xFF4568DC), Color(0xFFB06AB3)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      );
    }

    return Container(
      height: 200,
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
        boxShadow: const [
          BoxShadow(
            color: Colors.black45,
            blurRadius: 8,
            offset: Offset(0, 4),
          )
        ],
      ),
      child: Stack(
        children: [
          // Cyberpunk/futuristic lines pattern
          Positioned.fill(
            child: Opacity(
              opacity: 0.15,
              child: CustomPaint(
                painter: CardLinesPainter(),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    FutureBuilder<String>(
                      future: Get.find<VaultViewModel>().decryptField(titleJson),
                      builder: (c, s) => Text(
                        s.data ?? 'Decrypting...',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.1,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    Row(
                      children: [
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: Icon(
                            isFavorite ? Icons.star : Icons.star_border,
                            color: isFavorite ? Colors.yellow : Colors.white70,
                          ),
                          onPressed: onFavoriteToggle,
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                          onPressed: onDelete,
                        ),
                      ],
                    )
                  ],
                ),

                // Chip icon representation
                Container(
                  width: 40,
                  height: 30,
                  decoration: BoxDecoration(
                    color: Colors.amber[300]!.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.amber[600]!, width: 1.5),
                  ),
                ),

                // Masked number
                const Text(
                  '••••  ••••  ••••  ••••',
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 20,
                    letterSpacing: 2.0,
                    fontWeight: FontWeight.bold,
                    color: Colors.white70,
                  ),
                ),

                // Brand indicator and reveal trigger
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text(
                      brand.toUpperCase(),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Colors.white,
                      ),
                    ),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.lock_open, size: 14),
                      label: const Text('Reveal'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white12,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                      onPressed: onReveal,
                    )
                  ],
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, VaultViewModel controller, String itemId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Card'),
        content: const Text('Are you sure you want to permanently delete this card credentials?'),
        actions: [
          TextButton(
            child: const Text('Cancel'),
            onPressed: () => Navigator.of(context).pop(false),
          ),
          TextButton(
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
            onPressed: () => Navigator.of(context).pop(true),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await controller.deleteItem(itemId);
      if (success) {
        Get.snackbar('Deleted', 'Card credentials deleted.');
      }
    }
  }

  void _revealCardDetails(BuildContext context, VaultViewModel controller, dynamic card) async {
    // Show decryption modal loading state
    Get.bottomSheet(
      CardDecryptionModal(card: card),
      isScrollControlled: true,
    );
  }
}

/// Decryption sandboxed bottom sheet modal to decrypt details on-demand.
class CardDecryptionModal extends StatefulWidget {
  final dynamic card;
  const CardDecryptionModal({Key? key, required this.card}) : super(key: key);

  @override
  State<CardDecryptionModal> createState() => _CardDecryptionModalState();
}

class _CardDecryptionModalState extends State<CardDecryptionModal> {
  final controller = Get.find<VaultViewModel>();

  String holderName = '';
  String cardNumber = '';
  String expiryDate = '';
  String cvv = '';
  bool isDecrypting = true;
  String error = '';

  @override
  void initState() {
    super.initState();
    _decryptAllFields();
  }

  Future<void> _decryptAllFields() async {
    try {
      final payload = widget.card['encryptedPayload'];
      
      final String? nameEnc = payload['cardholderName_enc']?.toString();
      final String? numberEnc = payload['cardNumber_enc']?.toString();
      final String? expiryEnc = payload['expiryDate_enc']?.toString();
      final String? cvvEnc = payload['cvv_enc']?.toString();

      final decryptedName = await controller.decryptField(nameEnc);
      final decryptedNumber = await controller.decryptField(numberEnc);
      final decryptedExpiry = await controller.decryptField(expiryEnc);
      final decryptedCvv = await controller.decryptField(cvvEnc);

      // Format card number with spaces for readibility (e.g. 1234 5678 1234 5678)
      final buffer = StringBuffer();
      for (var i = 0; i < decryptedNumber.length; i++) {
        if (i > 0 && i % 4 == 0) {
          buffer.write(' ');
        }
        buffer.write(decryptedNumber[i]);
      }

      setState(() {
        holderName = decryptedName;
        cardNumber = buffer.toString();
        expiryDate = decryptedExpiry;
        cvv = decryptedCvv;
        isDecrypting = false;
      });
    } catch (e) {
      setState(() {
        error = 'Decryption failed. Secure keys mismatch.';
        isDecrypting = false;
      });
    }
  }

  @override
  void dispose() {
    // Clear out sensitive text values from screen heap allocation
    holderName = '';
    cardNumber = '';
    expiryDate = '';
    cvv = '';
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: AppTheme.surfaceColor,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(top: BorderSide(color: Colors.white10)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '🔒 Decrypted Credentials',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Get.back(),
              )
            ],
          ),
          const SizedBox(height: 20),
          if (isDecrypting)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24.0),
                child: CircularProgressIndicator(),
              ),
            )
          else if (error.isNotEmpty)
            Text(error, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center)
          else ...[
            // Card Number block
            Container(
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: AppTheme.backgroundColor,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white10),
              ),
              child: Text(
                cardNumber,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, fontFamily: 'monospace', color: Colors.white),
              ),
            ),
            const SizedBox(height: 20),
            
            // Expiry / CVV Row
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('CARDHOLDER', style: TextStyle(color: Colors.grey, fontSize: 11)),
                      const SizedBox(height: 4),
                      Text(holderName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const Text('EXPIRY', style: TextStyle(color: Colors.grey, fontSize: 11)),
                      const SizedBox(height: 4),
                      Text(expiryDate, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('CVV', style: TextStyle(color: Colors.grey, fontSize: 11)),
                      const SizedBox(height: 4),
                      Text(cvv, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'monospace', color: AppTheme.primaryColor)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ]
        ],
      ),
    );
  }
}

/// Custom painter for cyber lines texture on card mockups.
class CardLinesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.3)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final path = Path();
    path.moveTo(0, size.height * 0.2);
    path.lineTo(size.width * 0.4, size.height * 0.2);
    path.lineTo(size.width * 0.6, size.height * 0.8);
    path.lineTo(size.width, size.height * 0.8);

    path.moveTo(0, size.height * 0.5);
    path.lineTo(size.width * 0.3, size.height * 0.5);
    path.lineTo(size.width * 0.5, size.height * 0.9);
    path.lineTo(size.width, size.height * 0.9);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
