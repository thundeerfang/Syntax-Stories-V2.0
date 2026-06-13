import 'package:flutter/material.dart';

const blogStreakModeDaily = 'daily';
const blogStreakModeWeekly = 'weekly';
const blogStreakModeMonthly = 'monthly';

const blogStreakModes = [
  blogStreakModeDaily,
  blogStreakModeWeekly,
  blogStreakModeMonthly,
];

String blogStreakModeLabel(String mode) {
  return switch (mode) {
    blogStreakModeWeekly => 'Weekly',
    blogStreakModeMonthly => 'Monthly',
    _ => 'Daily',
  };
}

String blogStreakModeHint(String mode) {
  return switch (mode) {
    blogStreakModeWeekly => 'Consecutive ISO weeks with at least one read.',
    blogStreakModeMonthly => 'Consecutive calendar months with at least one read.',
    _ => 'Consecutive UTC days with at least one read.',
  };
}

IconData blogStreakModeIcon(String mode) {
  return switch (mode) {
    blogStreakModeWeekly => Icons.date_range_rounded,
    blogStreakModeMonthly => Icons.calendar_month_rounded,
    _ => Icons.today_rounded,
  };
}

String? parseBlogStreakMode(dynamic value) {
  final raw = value?.toString().trim();
  if (raw == blogStreakModeWeekly || raw == blogStreakModeMonthly || raw == blogStreakModeDaily) {
    return raw;
  }
  return null;
}
