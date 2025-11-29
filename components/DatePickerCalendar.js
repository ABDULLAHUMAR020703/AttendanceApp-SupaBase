import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DatePickerCalendar = ({ 
  onDateSelect, 
  selectedStartDate, 
  selectedEndDate, 
  previewDate = null,
  minDate = null,
  maxDate = null,
  allowRangeSelection = false 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDateObj = minDate ? new Date(minDate) : today;
  minDateObj.setHours(0, 0, 0, 0);

  const maxDateObj = maxDate ? new Date(maxDate) : null;
  if (maxDateObj) {
    maxDateObj.setHours(0, 0, 0, 0);
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isDateSelected = (dateStr) => {
    if (!selectedStartDate) return false;
    if (!allowRangeSelection || !selectedEndDate) {
      return dateStr === selectedStartDate;
    }
    const date = new Date(dateStr);
    const start = new Date(selectedStartDate);
    const end = new Date(selectedEndDate);
    return date >= start && date <= end;
  };

  const isDateDisabled = (date) => {
    const dateStr = formatDate(date);
    const dateObj = new Date(dateStr);
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj < minDateObj) return true;
    if (maxDateObj && dateObj > maxDateObj) return true;
    return false;
  };

  const isStartDate = (dateStr) => {
    return dateStr === selectedStartDate;
  };

  const isEndDate = (dateStr) => {
    return allowRangeSelection && dateStr === selectedEndDate;
  };

  const isInRange = (dateStr) => {
    if (!allowRangeSelection || !selectedStartDate || !selectedEndDate) return false;
    const date = new Date(dateStr);
    const start = new Date(selectedStartDate);
    const end = new Date(selectedEndDate);
    return date > start && date < end;
  };

  const handleDatePress = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = formatDate(date);

    if (isDateDisabled(date)) return;

    // Just pass the selected date to parent - buttons will handle assignment
    onDateSelect(dateStr);
  };

  const isPreviewDate = (dateStr) => {
    return previewDate && dateStr === previewDate;
  };

  const handleMonthChange = (direction) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => handleMonthChange(-1)}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={20} color="#3b82f6" />
        </TouchableOpacity>

        <Text style={styles.monthYear}>
          {monthNames[month]} {year}
        </Text>

        <TouchableOpacity
          onPress={() => handleMonthChange(1)}
          style={styles.navButton}
        >
          <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Day Names */}
      <View style={styles.dayNamesRow}>
        {dayNames.map((dayName) => (
          <View key={dayName} style={styles.dayNameCell}>
            <Text style={styles.dayNameText}>{dayName}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {days.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const date = new Date(year, month, day);
          const dateStr = formatDate(date);
          const disabled = isDateDisabled(date);
          const selected = isDateSelected(dateStr);
          const isStart = isStartDate(dateStr);
          const isEnd = isEndDate(dateStr);
          const inRange = isInRange(dateStr);
          const isPreview = isPreviewDate(dateStr) && !selected;
          const isToday = dateStr === formatDate(today);

          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayCell,
                selected && styles.selectedDay,
                isStart && styles.startDay,
                isEnd && styles.endDay,
                inRange && styles.rangeDay,
                disabled && styles.disabledDay,
                isToday && !selected && !isPreview && styles.todayDay,
                isPreview && styles.previewDay,
              ]}
              onPress={() => handleDatePress(day)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.dayText,
                  selected && styles.selectedDayText,
                  disabled && styles.disabledDayText,
                  isToday && !selected && !isPreview && styles.todayDayText,
                  isPreview && styles.previewDayText,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 14,
    color: '#1f2937',
  },
  selectedDay: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  startDay: {
    backgroundColor: '#3b82f6',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  endDay: {
    backgroundColor: '#3b82f6',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  rangeDay: {
    backgroundColor: '#dbeafe',
  },
  disabledDay: {
    opacity: 0.3,
  },
  disabledDayText: {
    color: '#9ca3af',
  },
  todayDay: {
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 8,
  },
  todayDayText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  previewDay: {
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 8,
    backgroundColor: '#d1fae5',
  },
  previewDayText: {
    color: '#059669',
    fontWeight: '600',
  },
});

export default DatePickerCalendar;

