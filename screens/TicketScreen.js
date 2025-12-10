import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  FlatList,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createTicket,
  getUserTickets,
  getCategoryLabel,
  getPriorityLabel,
  getStatusLabel,
  getPriorityColor,
  getStatusColor,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUS,
} from '../utils/ticketManagement';
import { useTheme } from '../contexts/ThemeContext';

export default function TicketScreen({ navigation, route }) {
  const { user } = route.params;
  const { colors } = useTheme();
  const [tickets, setTickets] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, open, in_progress, resolved, closed
  
  // Form state
  const [category, setCategory] = useState(TICKET_CATEGORIES.TECHNICAL);
  const [priority, setPriority] = useState(TICKET_PRIORITIES.MEDIUM);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTickets();
    const unsubscribe = navigation.addListener('focus', () => {
      loadTickets();
    });
    return unsubscribe;
  }, [navigation, filter]);

  const loadTickets = async () => {
    try {
      const userTickets = await getUserTickets(user.username);
      // Sort by created date (newest first)
      const sorted = userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Apply filter
      let filtered = sorted;
      if (filter !== 'all') {
        filtered = sorted.filter(ticket => ticket.status === filter);
      }
      
      setTickets(filtered);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadTickets();
    setIsRefreshing(false);
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in subject and description');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createTicket(
        user.username,
        category,
        priority,
        subject,
        description
      );

      if (result.success) {
        Alert.alert('Success', 'Ticket created successfully');
        setShowCreateModal(false);
        setSubject('');
        setDescription('');
        setCategory(TICKET_CATEGORIES.TECHNICAL);
        setPriority(TICKET_PRIORITIES.MEDIUM);
        await loadTickets();
      } else {
        Alert.alert('Error', result.error || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderTicket = ({ item }) => (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {item.subject}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textTertiary,
            }}
          >
            Created {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View
            style={{
              backgroundColor: getStatusColor(item.status) + '20',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: getStatusColor(item.status),
              }}
            >
              {getStatusLabel(item.status)}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: getPriorityColor(item.priority) + '20',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: getPriorityColor(item.priority),
              }}
            >
              {getPriorityLabel(item.priority)}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginLeft: 6,
          }}
        >
          {getCategoryLabel(item.category)}
        </Text>
        {item.assignedTo && (
          <>
            <Text style={{ color: colors.textTertiary, marginHorizontal: 8 }}>•</Text>
            <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginLeft: 6,
              }}
            >
              Assigned to {item.assignedTo}
            </Text>
          </>
        )}
      </View>

      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          marginBottom: 8,
        }}
      >
        {item.description}
      </Text>

      {item.responses && item.responses.length > 0 && (
        <View
          style={{
            backgroundColor: colors.background,
            borderRadius: 8,
            padding: 12,
            marginTop: 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {item.responses.length} Response{item.responses.length !== 1 ? 's' : ''}
          </Text>
          {item.responses.slice(-1).map((response) => (
            <View key={response.id} style={{ marginTop: 4 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                }}
              >
                {response.respondedBy}: {response.message}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: colors.text,
            }}
          >
            My Tickets
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
            onPress={() => setShowCreateModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="add" size={18} color="white" />
              <Text
                style={{
                  color: 'white',
                  fontWeight: '600',
                  marginLeft: 4,
                }}
              >
                New Ticket
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
          {['all', TICKET_STATUS.OPEN, TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].map((filterType) => (
            <TouchableOpacity
              key={filterType}
              onPress={() => setFilter(filterType)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor: filter === filterType ? colors.primary : colors.background,
              }}
            >
              <Text
                style={{
                  color: filter === filterType ? 'white' : colors.textSecondary,
                  fontWeight: filter === filterType ? '600' : '400',
                  fontSize: 12,
                  textTransform: 'capitalize',
                }}
              >
                {filterType === 'all' ? 'All' : getStatusLabel(filterType)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tickets List */}
      {tickets.length > 0 ? (
        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          <Ionicons name="ticket-outline" size={64} color={colors.textTertiary} />
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.text,
              marginTop: 16,
            }}
          >
            No tickets
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            {filter === 'all'
              ? 'You don\'t have any tickets yet. Tap "New Ticket" to create one.'
              : `No ${getStatusLabel(filter).toLowerCase()} tickets`}
          </Text>
        </ScrollView>
      )}

      {/* Create Ticket Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: '90%',
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: colors.text,
                  }}
                >
                  Create New Ticket
                </Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Category */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '500' }}>Category *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {Object.values(TICKET_CATEGORIES).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={{
                        borderRadius: 8,
                        padding: 12,
                        borderWidth: 2,
                        borderColor: category === cat ? colors.primary : colors.border,
                        backgroundColor: category === cat ? colors.primaryLight : 'transparent',
                        minWidth: '30%',
                      }}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={{
                          textAlign: 'center',
                          fontSize: 12,
                          fontWeight: '500',
                          color: category === cat ? colors.primary : colors.text,
                        }}
                      >
                        {getCategoryLabel(cat)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Priority */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '500' }}>Priority *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {Object.values(TICKET_PRIORITIES).map((pri) => (
                    <TouchableOpacity
                      key={pri}
                      style={{
                        borderRadius: 8,
                        padding: 12,
                        borderWidth: 2,
                        borderColor: priority === pri ? getPriorityColor(pri) : colors.border,
                        backgroundColor: priority === pri ? getPriorityColor(pri) + '20' : 'transparent',
                        minWidth: '22%',
                      }}
                      onPress={() => setPriority(pri)}
                    >
                      <Text
                        style={{
                          textAlign: 'center',
                          fontSize: 12,
                          fontWeight: '500',
                          color: priority === pri ? getPriorityColor(pri) : colors.text,
                        }}
                      >
                        {getPriorityLabel(pri)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Subject */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '500' }}>Subject *</Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: colors.text,
                  }}
                  placeholder="Enter ticket subject"
                  placeholderTextColor={colors.textTertiary}
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>

              {/* Description */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.text, marginBottom: 8, fontWeight: '500' }}>Description *</Text>
                <TextInput
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    color: colors.text,
                    minHeight: 100,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Describe your issue in detail..."
                  placeholderTextColor={colors.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={5}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.border,
                    borderRadius: 8,
                    padding: 12,
                    flex: 1,
                  }}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={{ textAlign: 'center', fontWeight: '500', color: colors.text }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                    padding: 12,
                    flex: 1,
                  }}
                  onPress={handleCreateTicket}
                  disabled={isSubmitting}
                >
                  <Text style={{ textAlign: 'center', fontWeight: '500', color: 'white' }}>
                    {isSubmitting ? 'Creating...' : 'Create Ticket'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}









