import 'package:flutter/material.dart';

/// Custom styling theme for Personal Vault app.
class AppTheme {
  static const Color primaryColor = Color(0xFF66FCF1);
  static const Color secondaryColor = Color(0xFF45A29E);
  static const Color backgroundColor = Color(0xFF0B0C10);
  static const Color surfaceColor = Color(0xFF1F2833);
  static const Color textPrimaryColor = Colors.white;
  static const Color textMutedColor = Color(0xFFC5C6C7);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: primaryColor,
      scaffoldBackgroundColor: backgroundColor,
      colorScheme: const ColorScheme.dark(
        primary: primaryColor,
        secondary: secondaryColor,
        surface: surfaceColor,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: backgroundColor,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: primaryColor),
        titleTextStyle: TextStyle(
          color: textPrimaryColor,
          fontSize: 20,
          fontWeight: FontWeight.bold,
          fontFamily: 'Outfit',
        ),
      ),
      textTheme: const TextTheme(
        headlineMedium: TextStyle(
          color: textPrimaryColor,
          fontSize: 24,
          fontWeight: FontWeight.bold,
          fontFamily: 'Outfit',
        ),
        bodyLarge: TextStyle(
          color: textPrimaryColor,
          fontSize: 16,
          fontFamily: 'Outfit',
        ),
        bodyMedium: TextStyle(
          color: textMutedColor,
          fontSize: 14,
          fontFamily: 'Outfit',
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceColor,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: primaryColor, width: 1.5),
        ),
        labelStyle: const TextStyle(color: textMutedColor),
        prefixIconColor: secondaryColor,
      ),
      useMaterial3: true,
    );
  }
}
