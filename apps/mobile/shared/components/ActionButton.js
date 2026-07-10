import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function ActionButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  colors,
  style,
  textStyle,
  accessibilityLabel,
}) {
  const isDisabled = disabled || loading;
  const palette = {
    primary: { bg: colors.primary, text: '#fff' },
    secondary: { bg: colors.border, text: colors.text },
    danger: { bg: colors.error, text: '#fff' },
    success: { bg: colors.success, text: '#fff' },
  }[variant] || { bg: colors.primary, text: '#fff' };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        { backgroundColor: isDisabled ? colors.border : palette.bg, opacity: isDisabled ? 0.65 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} style={styles.icon} />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={palette.text} style={styles.icon} />
      ) : null}
      <Text style={[styles.label, { color: palette.text }, textStyle]}>{loading ? 'Please wait…' : label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 48,
  },
  icon: { marginRight: 8 },
  label: { fontSize: 16, fontWeight: '600' },
});
