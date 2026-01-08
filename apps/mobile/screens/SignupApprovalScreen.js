import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getSignupRequests,
  approveSignupRequest,
  rejectSignupRequest,
} from '../utils/signupRequests';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { fontSize, spacing, iconSize, componentSize, responsivePadding, responsiveFont, wp } from '../utils/responsive';
import Logo from '../components/Logo';
import Trademark from '../components/Trademark';

export default function SignupApprovalScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      const allRequests = await getSignupRequests();
      let filtered = allRequests;

      if (filter !== 'all') {
        filtered = allRequests.filter(req => req.status === filter);
      }

      setRequests(filtered);
    } catch (error) {
      console.error('Error loading signup requests:', error);
      Alert.alert('Error', 'Failed to load signup requests');
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadRequests();
    setIsRefreshing(false);
  };

  const handleApprove = async (requestId) => {
    Alert.alert(
      'Approve Signup Request',
      'Are you sure you want to approve this signup request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              const result = await approveSignupRequest(requestId, user.username);
              if (result.success) {
                Alert.alert('Success', 'Signup request approved successfully');
                await loadRequests();
              } else {
                Alert.alert('Error', result.error || 'Failed to approve request');
              }
            } catch (error) {
              console.error('Error approving request:', error);
              Alert.alert('Error', 'Failed to approve signup request');
            }
          },
        },
      ]
    );
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedRequest) return;

    try {
      const result = await rejectSignupRequest(
        selectedRequest.id,
        user.username,
        rejectionReason
      );
      if (result.success) {
        Alert.alert('Success', 'Signup request rejected');
        setShowRejectModal(false);
        setSelectedRequest(null);
        setRejectionReason('');
        await loadRequests();
      } else {
        Alert.alert('Error', result.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('Error', 'Failed to reject signup request');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const renderRequest = ({ item }) => (
    <View
      className="bg-white rounded-xl shadow-sm"
      style={{
        padding: responsivePadding(16),
        marginBottom: spacing.md,
        marginHorizontal: spacing.sm,
      }}
    >
      <View className="flex-row items-start justify-between" style={{ marginBottom: spacing.sm }}>
        <View className="flex-1" style={{ flexShrink: 1 }}>
          <Text
            className="font-bold text-gray-800"
            style={{
              fontSize: responsiveFont(18),
              marginBottom: spacing.xs / 2,
            }}
          >
            {item.name}
          </Text>
          <Text
            className="text-gray-600"
            style={{ fontSize: responsiveFont(14), marginBottom: spacing.xs / 2 }}
          >
            @{item.username}
          </Text>
          <Text
            className="text-gray-500"
            style={{ fontSize: responsiveFont(12) }}
          >
            {item.email}
          </Text>
        </View>
        <View
          className="rounded-full"
          style={{
            backgroundColor: `${getStatusColor(item.status)}20`,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs / 2,
          }}
        >
          <Text
            className="font-medium"
            style={{
              color: getStatusColor(item.status),
              fontSize: responsiveFont(10),
              textTransform: 'uppercase',
            }}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={{ marginBottom: spacing.sm }}>
        <Text
          className="text-gray-500"
          style={{ fontSize: responsiveFont(12) }}
        >
          Requested: {formatDate(item.requestedAt)}
        </Text>
        {item.approvedAt && (
          <Text
            className="text-gray-500"
            style={{ fontSize: responsiveFont(12) }}
          >
            {item.status === 'approved' ? 'Approved' : 'Rejected'}: {formatDate(item.approvedAt)}
            {item.approvedBy && ` by ${item.approvedBy}`}
          </Text>
        )}
        {item.rejectionReason && (
          <Text
            className="text-red-600"
            style={{ fontSize: responsiveFont(12), marginTop: spacing.xs / 2 }}
          >
            Reason: {item.rejectionReason}
          </Text>
        )}
      </View>

      {item.status === 'pending' && (
        <View className="flex-row" style={{ gap: spacing.sm }}>
          <TouchableOpacity
            className="flex-1 bg-green-500 rounded-lg"
            style={{
              paddingVertical: spacing.sm,
              alignItems: 'center',
            }}
            onPress={() => handleApprove(item.id)}
          >
            <Text
              className="text-white font-semibold"
              style={{ fontSize: responsiveFont(14) }}
            >
              Approve
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-red-500 rounded-lg"
            style={{
              paddingVertical: spacing.sm,
              alignItems: 'center',
            }}
            onPress={() => handleReject(item)}
          >
            <Text
              className="text-white font-semibold"
              style={{ fontSize: responsiveFont(14) }}
            >
              Reject
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const FilterButton = ({ title, value }) => (
    <TouchableOpacity
      className={`rounded-full ${filter === value ? 'bg-primary-500' : 'bg-gray-200'}`}
      style={{
        paddingHorizontal: responsivePadding(16),
        paddingVertical: spacing.xs,
        marginRight: spacing.xs,
      }}
      onPress={() => setFilter(value)}
    >
      <Text
        className={`font-medium ${filter === value ? 'text-white' : 'text-gray-700'}`}
        style={{ fontSize: responsiveFont(14) }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="bg-white shadow-sm"
        style={{
          paddingHorizontal: responsivePadding(24),
          paddingVertical: responsivePadding(16),
        }}
      >
        <View className="flex-row items-center" style={{ marginBottom: spacing.md }}>
          <Logo size="small" style={{ marginRight: spacing.sm }} />
          <Text
            className="font-bold text-gray-800"
            style={{
              fontSize: responsiveFont(20),
            }}
          >
            Signup Approvals
          </Text>
        </View>

        {/* Filter Buttons */}
        <View className="flex-row">
          <FilterButton title="Pending" value="pending" />
          <FilterButton title="Approved" value="approved" />
          <FilterButton title="Rejected" value="rejected" />
          <FilterButton title="All" value="all" />
        </View>
      </View>

      {/* Requests List */}
      {requests.length > 0 ? (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.sm }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View
          className="flex-1 justify-center items-center"
          style={{ paddingHorizontal: responsivePadding(24) }}
        >
          <Ionicons name="document-text-outline" size={iconSize['4xl']} color="#d1d5db" />
          <Text
            className="font-semibold text-gray-500 text-center"
            style={{
              fontSize: responsiveFont(20),
              marginTop: spacing.md,
            }}
          >
            No signup requests found
          </Text>
          <Text
            className="text-gray-400 text-center"
            style={{
              fontSize: responsiveFont(14),
              marginTop: spacing.xs,
            }}
          >
            {filter === 'pending'
              ? 'No pending signup requests'
              : `No ${filter} signup requests`}
          </Text>
        </View>
      )}

      {/* Trademark */}
      <View style={{ padding: responsivePadding(16) }}>
        <Trademark position="bottom" />
      </View>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
            <View
              className="bg-white rounded-xl"
              style={{
                padding: responsivePadding(24),
                width: wp(90),
                maxWidth: 400,
              }}
            >
            <Text
              className="font-bold text-gray-800"
              style={{
                fontSize: responsiveFont(20),
                marginBottom: spacing.md,
              }}
            >
              Reject Signup Request
            </Text>
            <Text
              className="text-gray-600"
              style={{
                fontSize: responsiveFont(14),
                marginBottom: spacing.md,
              }}
            >
              Please provide a reason for rejection (optional):
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-gray-800"
              placeholder="Rejection reason..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
              style={{
                fontSize: responsiveFont(14),
                marginBottom: spacing.md,
                textAlignVertical: 'top',
              }}
            />
            <View className="flex-row" style={{ gap: spacing.sm }}>
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-lg"
                style={{
                  paddingVertical: spacing.md,
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
              >
                <Text
                  className="font-semibold text-gray-700"
                  style={{ fontSize: responsiveFont(16) }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 rounded-lg"
                style={{
                  paddingVertical: spacing.md,
                  alignItems: 'center',
                }}
                onPress={confirmReject}
              >
                <Text
                  className="font-semibold text-white"
                  style={{ fontSize: responsiveFont(16) }}
                >
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}


