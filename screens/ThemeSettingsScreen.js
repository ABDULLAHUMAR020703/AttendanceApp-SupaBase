import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeSettingsScreen({ navigation, route }) {
  const { user } = route.params;
  const { theme, themePreference, colors, setTheme, toggleTheme } = useTheme();
  const [selectedPreference, setSelectedPreference] = useState(themePreference);

  const handleThemeChange = (newTheme) => {
    setSelectedPreference(newTheme);
    setTheme(newTheme);
  };

  const ThemeOption = ({ value, label, icon, description }) => {
    const isSelected = selectedPreference === value;
    
    return (
      <TouchableOpacity
        onPress={() => handleThemeChange(value)}
        style={{
          backgroundColor: isSelected ? colors.primaryLight : colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: 2,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isSelected ? colors.primary : colors.borderLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons
            name={icon}
            size={20}
            color={isSelected ? colors.surface : colors.textSecondary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {label}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
            }}
          >
            {description}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Ionicons name="color-palette" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: colors.text,
                }}
              >
                Theme Settings
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                Choose your preferred theme
              </Text>
            </View>
          </View>
        </View>

        {/* Current Theme Info */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 8,
            }}
          >
            Current Theme
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                borderWidth: 2,
                borderColor: colors.border,
                marginRight: 12,
              }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.text,
                textTransform: 'capitalize',
              }}
            >
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </View>
        </View>

        {/* Theme Options */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 12,
            }}
          >
            Theme Preference
          </Text>

          <ThemeOption
            value="light"
            label="Light Mode"
            icon="sunny"
            description="Always use light theme"
          />

          <ThemeOption
            value="dark"
            label="Dark Mode"
            icon="moon"
            description="Always use dark theme"
          />

          <ThemeOption
            value="system"
            label="System Default"
            icon="phone-portrait"
            description="Follow device theme settings"
          />
        </View>

        {/* Quick Toggle */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: 4,
                }}
              >
                Quick Toggle
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                }}
              >
                Toggle between light and dark mode
              </Text>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        {/* Preview */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 12,
            }}
          >
            Preview
          </Text>
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              padding: 16,
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.text,
                marginBottom: 4,
              }}
            >
              Sample Card
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
              }}
            >
              This is how content will look in {theme === 'dark' ? 'dark' : 'light'} mode
            </Text>
          </View>
          <View
            style={{
              backgroundColor: colors.primaryLight,
              borderRadius: 8,
              padding: 12,
              marginTop: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: colors.primary,
                fontWeight: '500',
              }}
            >
              Primary color preview
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

