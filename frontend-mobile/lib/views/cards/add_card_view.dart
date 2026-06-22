import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../core/theme/app_theme.dart';
import '../../viewmodels/vault_viewmodel.dart';

/// Screen presenting credential input form to create and encrypt debit/credit cards.
class AddCardView extends StatefulWidget {
  const AddCardView({Key? key}) : super(key: key);

  @override
  State<AddCardView> createState() => _AddCardViewState();
}

class _AddCardViewState extends State<AddCardView> {
  final VaultViewModel controller = Get.find<VaultViewModel>();
  final _formKey = GlobalKey<FormState>();

  final labelController = TextEditingController();
  final cardholderController = TextEditingController();
  final numberController = TextEditingController();
  final expiryController = TextEditingController();
  final cvvController = TextEditingController();

  String brand = 'visa';

  @override
  void dispose() {
    labelController.dispose();
    cardholderController.dispose();
    numberController.dispose();
    expiryController.dispose();
    cvvController.dispose();
    super.dispose();
  }

  void _submitCard() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await controller.createCard(
      label: labelController.text,
      brand: brand,
      cardholder: cardholderController.text,
      number: numberController.text,
      expiry: expiryController.text,
      cvv: cvvController.text,
    );

    if (success) {
      Get.back();
      Get.snackbar(
        'Success',
        'Card registered and encrypted client-side.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.green,
        colorText: Colors.white,
      );
    } else {
      Get.snackbar(
        'Error',
        'Failed to save card credentials.',
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Card'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Info Banner
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.primaryColor.withOpacity(0.2)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.lock_outline, color: AppTheme.primaryColor, size: 20),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'All values are encrypted locally using AES-GCM-256 before synchronization.',
                        style: TextStyle(fontSize: 12, color: AppTheme.primaryColor),
                      ),
                    )
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Title label
              TextFormField(
                controller: labelController,
                decoration: const InputDecoration(
                  labelText: 'Card Label',
                  prefixIcon: Icon(Icons.bookmark_outline),
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Card label is required.' : null,
              ),
              const SizedBox(height: 16),

              // Brand drop-down and CVV row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: brand,
                      decoration: const InputDecoration(
                        labelText: 'Brand',
                        prefixIcon: Icon(Icons.credit_card_outlined),
                      ),
                      dropdownColor: AppTheme.surfaceColor,
                      items: const [
                        DropdownMenuItem(value: 'visa', child: Text('Visa')),
                        DropdownMenuItem(value: 'mastercard', child: Text('Mastercard')),
                        DropdownMenuItem(value: 'amex', child: Text('Amex')),
                        DropdownMenuItem(value: 'rupay', child: Text('Rupay')),
                        DropdownMenuItem(value: 'other', child: Text('Other')),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setState(() {
                            brand = val;
                          });
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: cvvController,
                      obscureText: true,
                      maxLength: 4,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'CVV',
                        prefixIcon: Icon(Icons.security),
                        counterText: '',
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'CVV is required.';
                        if (val.length < 3) return 'Invalid CVV.';
                        return null;
                      },
                    ),
                  )
                ],
              ),
              const SizedBox(height: 16),

              // Cardholder Name
              TextFormField(
                controller: cardholderController,
                decoration: const InputDecoration(
                  labelText: 'Cardholder Name',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Cardholder name is required.' : null,
              ),
              const SizedBox(height: 16),

              // Card Number and Expiry Row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: numberController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Card Number',
                        prefixIcon: Icon(Icons.tag),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Card number is required.';
                        if (val.replaceAll(' ', '').length < 12) return 'Invalid card length.';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: expiryController,
                      keyboardType: TextInputType.datetime,
                      maxLength: 5,
                      decoration: const InputDecoration(
                        labelText: 'Expiry (MM/YY)',
                        prefixIcon: Icon(Icons.calendar_today_outlined),
                        counterText: '',
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Expiry required.';
                        if (!val.contains('/')) return 'Format MM/YY.';
                        return null;
                      },
                    ),
                  )
                ],
              ),
              const SizedBox(height: 32),

              // Action button
              Obx(() => ElevatedButton(
                onPressed: controller.isLoading.value ? null : _submitCard,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: AppTheme.backgroundColor,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: controller.isLoading.value
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.backgroundColor),
                    )
                  : const Text('Encrypt & Save Card', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              )),
            ],
          ),
        ),
      ),
    );
  }
}
