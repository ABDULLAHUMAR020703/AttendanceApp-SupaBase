import React from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { wp } from '../utils/responsive';

export default function Logo({ size = 'medium', style }) {
  const sizes = {
    small: { width: wp(8), height: wp(8) },
    medium: { width: wp(12), height: wp(12) },
    large: { width: wp(20), height: wp(20) },
  };

  const currentSize = sizes[size] || sizes.medium;

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../assets/logo.png')}
        style={[
          styles.logoImage,
          {
            width: currentSize.width,
            height: currentSize.height,
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
});

