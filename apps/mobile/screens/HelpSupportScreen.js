import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Clipboard,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../core/contexts/ThemeContext';
import { useAuth } from '../core/contexts/AuthContext';
import { fontSize, spacing, iconSize, responsiveFont, responsivePadding } from '../utils/responsive';

const SUPPORT_EMAIL = 'sales@techdotglobal.com';
const APP_NAME = 'hadir.ai';

export default function HelpSupportScreen({ navigation, route }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackEmailData, setFallbackEmailData] = useState(null);

  const copyToClipboard = async (text) => {
    try {
      // Use React Native's Clipboard API
      // Note: Clipboard is deprecated in newer RN versions but still works in 0.81.5
      if (Clipboard && Clipboard.setString) {
        Clipboard.setString(text);
        Alert.alert('Copied', 'Email content copied to clipboard');
        console.log('[HelpSupport] Content copied to clipboard successfully');
      } else {
        // Fallback if Clipboard API is not available
        console.warn('[HelpSupport] Clipboard API not available');
        Alert.alert(
          'Copy Manually',
          'Please manually copy the email content shown above.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[HelpSupport] Error copying to clipboard:', error);
      Alert.alert(
        'Copy Failed',
        'Unable to copy to clipboard. Please manually copy the email content shown above.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Validation Error', 'Please enter your message before sending.');
      return;
    }

    setIsSending(true);

    try {
      // Format user role for display
      const userRole = user?.role || 'employee';
      const roleDisplay = userRole.charAt(0).toUpperCase() + userRole.slice(1).replace('_', ' ');

      // Create email subject - use "Super admin" format as specified
      const subject = `[${APP_NAME} Support] ${roleDisplay} Issue`;

      // Create email body with user details
      const emailBody = `User: ${user?.name || user?.username || 'Unknown'}
Email: ${user?.email || 'Not provided'}
Role: ${roleDisplay}

Message:
${message.trim()}`;

      // Encode the email body and subject for URL
      const encodedSubject = encodeURIComponent(subject);
      const encodedBody = encodeURIComponent(emailBody);

      // Create mailto URL with body
      const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;

      // PRODUCTION-SAFE: Check if mailto: links are supported BEFORE opening
      let canOpen = false;
      try {
        canOpen = await Linking.canOpenURL(mailtoUrl);
        console.log('[HelpSupport] canOpenURL check:', canOpen);
      } catch (canOpenError) {
        console.error('[HelpSupport] Error checking canOpenURL:', canOpenError);
        // On Android, canOpenURL might require query permissions
        // Try to open anyway if check fails
        canOpen = true;
      }

      if (canOpen) {
        try {
          await Linking.openURL(mailtoUrl);
          console.log('[HelpSupport] Email app opened successfully');
          
          // Show success message
          Alert.alert(
            'Message Sent',
            'Your message has been sent. We will get back to you soon!',
            [
              {
                text: 'OK',
                onPress: () => {
                  setMessage('');
                  navigation.goBack();
                },
              },
            ]
          );
        } catch (openError) {
          console.error('[HelpSupport] Error opening email app:', openError);
          // Fall through to fallback modal
          throw openError;
        }
      } else {
        // Fall through to fallback modal
        throw new Error('Email app not available');
      }
    } catch (error) {
      console.error('[HelpSupport] Error sending support message:', error);
      
      // Show fallback modal with email details
      const userRole = user?.role || 'employee';
      const roleDisplay = userRole.charAt(0).toUpperCase() + userRole.slice(1).replace('_', ' ');
      const subject = `[${APP_NAME} Support] ${roleDisplay} Issue`;
      const emailBody = `User: ${user?.name || user?.username || 'Unknown'}
Email: ${user?.email || 'Not provided'}
Role: ${roleDisplay}

Message:
${message.trim()}`;

      setFallbackEmailData({
        email: SUPPORT_EMAIL,
        subject: subject,
        body: emailBody,
        fullText: `To: ${SUPPORT_EMAIL}\nSubject: ${subject}\n\n${emailBody}`,
      });
      setShowFallbackModal(true);
    } finally {
      setIsSending(false);
    }
  };

  const handleAlternativeContact = async () => {
    try {
      const subject = `Support Request - ${APP_NAME}`;
      const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

      // PRODUCTION-SAFE: Check if mailto: links are supported
      let canOpen = false;
      try {
        canOpen = await Linking.canOpenURL(mailtoUrl);
        console.log('[HelpSupport] Alternative contact canOpenURL check:', canOpen);
      } catch (canOpenError) {
        console.error('[HelpSupport] Error checking canOpenURL (alternative):', canOpenError);
        canOpen = true; // Try anyway
      }

      if (canOpen) {
        try {
          await Linking.openURL(mailtoUrl);
          console.log('[HelpSupport] Alternative email opened successfully');
        } catch (openError) {
          console.error('[HelpSupport] Error opening alternative email:', openError);
          // Show fallback
          setFallbackEmailData({
            email: SUPPORT_EMAIL,
            subject: subject,
            body: '',
            fullText: `To: ${SUPPORT_EMAIL}\nSubject: ${subject}`,
          });
          setShowFallbackModal(true);
        }
      } else {
        // Show fallback
        setFallbackEmailData({
          email: SUPPORT_EMAIL,
          subject: subject,
          body: '',
          fullText: `To: ${SUPPORT_EMAIL}\nSubject: ${subject}`,
        });
        setShowFallbackModal(true);
      }
    } catch (error) {
      console.error('[HelpSupport] Error in alternative contact:', error);
      Alert.alert(
        'Error',
        'Unable to open email app. Please contact us directly at:\n\n' + SUPPORT_EMAIL
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: responsivePadding(16),
            paddingBottom: spacing['2xl'],
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: responsivePadding(20),
              marginBottom: spacing.lg,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
                alignSelf: 'center',
              }}
            >
              <Ionicons name="help-circle" size={32} color={colors.primary} />
            </View>
            <Text
              style={{
                color: colors.text,
                fontSize: responsiveFont(24),
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: spacing.xs,
              }}
            >
              Help & Support
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: responsiveFont(14),
                textAlign: 'center',
              }}
            >
              Describe your issue below and we'll get back to you as soon as possible.
            </Text>
          </View>

          {/* Chat Box Section */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: responsivePadding(16),
              marginBottom: spacing.lg,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: responsiveFont(16),
                fontWeight: '600',
                marginBottom: spacing.md,
              }}
            >
              Your Message
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: responsivePadding(16),
                minHeight: 150,
                maxHeight: 300,
                color: colors.text,
                fontSize: responsiveFont(14),
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: colors.border,
              }}
              placeholder="Describe your problem here..."
              placeholderTextColor={colors.textTertiary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={8}
              editable={!isSending}
            />
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: responsiveFont(12),
                marginTop: spacing.xs,
                textAlign: 'right',
              }}
            >
              {message.length} characters
            </Text>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={{
              backgroundColor: message.trim() ? colors.primary : colors.border,
              borderRadius: 12,
              paddingVertical: spacing.md,
              paddingHorizontal: responsivePadding(24),
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              marginBottom: spacing.lg,
              opacity: message.trim() && !isSending ? 1 : 0.6,
            }}
            onPress={handleSend}
            disabled={!message.trim() || isSending}
            activeOpacity={0.8}
          >
            {isSending ? (
              <>
                <ActivityIndicator size="small" color="white" style={{ marginRight: spacing.sm }} />
                <Text
                  style={{
                    color: 'white',
                    fontSize: responsiveFont(16),
                    fontWeight: '600',
                  }}
                >
                  Sending...
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="send" size={iconSize.md} color="white" style={{ marginRight: spacing.sm }} />
                <Text
                  style={{
                    color: 'white',
                    fontSize: responsiveFont(16),
                    fontWeight: '600',
                  }}
                >
                  Send Message
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Fallback Contact Section */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: responsivePadding(20),
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <Ionicons name="mail-outline" size={iconSize.lg} color={colors.primary} />
              <Text
                style={{
                  color: colors.text,
                  fontSize: responsiveFont(16),
                  fontWeight: '600',
                  marginLeft: spacing.sm,
                }}
              >
                Alternative Contact
              </Text>
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: responsiveFont(14),
                marginBottom: spacing.xs,
              }}
            >
              You can also contact us directly at:
            </Text>
            <TouchableOpacity
              onPress={handleAlternativeContact}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: spacing.xs,
              }}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: responsiveFont(14),
                  fontWeight: '500',
                }}
              >
                {SUPPORT_EMAIL}
              </Text>
              <Ionicons
                name="open-outline"
                size={iconSize.sm}
                color={colors.primary}
                style={{ marginLeft: spacing.xs }}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Fallback Modal - Shows when email app is not available */}
        <Modal
          visible={showFallbackModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFallbackModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: responsivePadding(24),
                maxHeight: '90%',
              }}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: spacing.lg,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                      name="mail-outline"
                      size={iconSize.lg}
                      color={colors.primary}
                      style={{ marginRight: spacing.sm }}
                    />
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: responsiveFont(20),
                        fontWeight: 'bold',
                      }}
                    >
                      Email App Not Available
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowFallbackModal(false)}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Email Content */}
                {fallbackEmailData && (
                  <>
                    <View
                      style={{
                        backgroundColor: colors.background,
                        borderRadius: 12,
                        padding: responsivePadding(16),
                        marginBottom: spacing.md,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: responsiveFont(12),
                          fontWeight: '600',
                          marginBottom: spacing.xs,
                          textTransform: 'uppercase',
                        }}
                      >
                        To:
                      </Text>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: responsiveFont(14),
                          marginBottom: spacing.md,
                        }}
                      >
                        {fallbackEmailData.email}
                      </Text>

                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: responsiveFont(12),
                          fontWeight: '600',
                          marginBottom: spacing.xs,
                          textTransform: 'uppercase',
                        }}
                      >
                        Subject:
                      </Text>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: responsiveFont(14),
                          marginBottom: spacing.md,
                        }}
                      >
                        {fallbackEmailData.subject}
                      </Text>

                      {fallbackEmailData.body && (
                        <>
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: responsiveFont(12),
                              fontWeight: '600',
                              marginBottom: spacing.xs,
                              textTransform: 'uppercase',
                            }}
                          >
                            Message:
                          </Text>
                          <Text
                            style={{
                              color: colors.text,
                              fontSize: responsiveFont(14),
                            }}
                          >
                            {fallbackEmailData.body}
                          </Text>
                        </>
                      )}
                    </View>

                    {/* Copy Button */}
                    <TouchableOpacity
                      onPress={() => copyToClipboard(fallbackEmailData.fullText)}
                      style={{
                        backgroundColor: colors.primary,
                        borderRadius: 12,
                        paddingVertical: spacing.md,
                        paddingHorizontal: responsivePadding(24),
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        marginBottom: spacing.md,
                      }}
                    >
                      <Ionicons
                        name="copy-outline"
                        size={iconSize.md}
                        color="white"
                        style={{ marginRight: spacing.sm }}
                      />
                      <Text
                        style={{
                          color: 'white',
                          fontSize: responsiveFont(16),
                          fontWeight: '600',
                        }}
                      >
                        Copy to Clipboard
                      </Text>
                    </TouchableOpacity>

                    {/* Instructions */}
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: responsiveFont(12),
                        textAlign: 'center',
                        marginTop: spacing.md,
                      }}
                    >
                      Please open your email app and paste the content above.
                    </Text>
                  </>
                )}

                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => {
                    setShowFallbackModal(false);
                    setFallbackEmailData(null);
                  }}
                  style={{
                    backgroundColor: colors.border,
                    borderRadius: 12,
                    paddingVertical: spacing.md,
                    paddingHorizontal: responsivePadding(24),
                    alignItems: 'center',
                    marginTop: spacing.md,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: responsiveFont(16),
                      fontWeight: '600',
                    }}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
