// Reusable Hamburger Menu Button Component
// Opens the drawer navigation menu
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { iconSize } from '../../utils/responsive';

/**
 * Hamburger Menu Button Component
 * Opens the drawer navigation menu when pressed
 * 
 * @param {Object} props
 * @param {string} props.color - Icon color (default: current theme text color)
 * @param {number} props.size - Icon size (default: 28)
 * @param {Object} props.style - Custom styles
 */
export default function HamburgerButton({ color, size = 28, style }) {
  const navigation = useNavigation();

  const handlePress = () => {
    if (navigation && navigation.openDrawer) {
      navigation.openDrawer();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[{ marginLeft: 16 }, style]}
      activeOpacity={0.7}
    >
      <Ionicons name="menu" size={size} color={color || '#fff'} />
    </TouchableOpacity>
  );
}

