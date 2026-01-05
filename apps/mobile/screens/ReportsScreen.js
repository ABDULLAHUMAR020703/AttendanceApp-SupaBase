/**
 * Reports Screen - Super Admin only
 * Allows Super Admin to generate reports
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../core/contexts/ThemeContext';
import { useAuth } from '../core/contexts/AuthContext';
import GenerateReportButton from '../features/analytics/components/GenerateReportButton';
import { fontSize, spacing, iconSize, responsiveFont, responsivePadding } from '../utils/responsive';
import HamburgerButton from '../shared/components/HamburgerButton';
import Logo from '../components/Logo';

export default function ReportsScreen({ route, navigation }) {
  const { user: routeUser } = route.params || {};
  const { colors } = useTheme();
  const { user: authUser } = useAuth();
  
  // Use user from route params or auth context (avoid duplicate user variable)
  const currentUser = routeUser || authUser;

  // Only show for super admin
  if (!currentUser || currentUser.role !== 'super_admin') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <HamburgerButton color="white" />
          <Text style={[styles.headerTitle, { fontSize: responsiveFont(20) }]}>Reports</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorText, { color: colors.error, fontSize: responsiveFont(16) }]}>
            Access Denied. Only Super Admins can access this section.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <HamburgerButton color="white" />
        <Text style={[styles.headerTitle, { fontSize: responsiveFont(20) }]}>Reports</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Section */}
        <View style={[styles.welcomeCard, { backgroundColor: colors.surface }]}>
          <View style={styles.welcomeHeader}>
            <Logo size="small" style={{ marginRight: spacing.md }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.welcomeTitle, { color: colors.text, fontSize: responsiveFont(20) }]}>
                Report Generation
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary, fontSize: responsiveFont(12) }]}>
                Generate comprehensive attendance, leave, and ticket reports
              </Text>
            </View>
          </View>
        </View>

        {/* Reports Section */}
        <View style={[styles.reportsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.reportsHeader}>
            <Ionicons name="document-text-outline" size={iconSize.lg} color={colors.primary} />
            <Text style={[styles.reportsTitle, { color: colors.text, fontSize: responsiveFont(18) }]}>
              Generate Report
            </Text>
          </View>
          <Text style={[styles.reportsDescription, { color: colors.textSecondary, fontSize: responsiveFont(14) }]}>
            Select a date range and generate a comprehensive report with:
          </Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={iconSize.sm} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text, fontSize: responsiveFont(13) }]}>
                Company-wide overview statistics
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={iconSize.sm} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text, fontSize: responsiveFont(13) }]}>
                Department-wise analytics
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={iconSize.sm} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text, fontSize: responsiveFont(13) }]}>
                Attendance, leave, and ticket statistics
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={iconSize.sm} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text, fontSize: responsiveFont(13) }]}>
                Professional PDF format
              </Text>
            </View>
          </View>
          <View style={styles.buttonContainer}>
            <GenerateReportButton />
          </View>
        </View>

        {/* Info Section */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="information-circle-outline" size={iconSize.md} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: responsiveFont(12) }]}>
            Reports are generated asynchronously and will be sent to your email address when ready.
            Monthly reports are automatically generated on the 1st of every month.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: responsivePadding(16),
    paddingVertical: responsivePadding(12),
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: responsivePadding(24),
  },
  welcomeCard: {
    borderRadius: 16,
    padding: responsivePadding(20),
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.xs / 2,
  },
  welcomeSubtitle: {
    marginTop: spacing.xs / 2,
  },
  reportsCard: {
    borderRadius: 16,
    padding: responsivePadding(20),
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reportsTitle: {
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  reportsDescription: {
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  featuresList: {
    marginBottom: spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: responsivePadding(16),
    marginBottom: spacing.md,
  },
  infoText: {
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: responsivePadding(24),
  },
  errorText: {
    textAlign: 'center',
    fontWeight: '600',
  },
});

