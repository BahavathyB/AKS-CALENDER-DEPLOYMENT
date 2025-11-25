// Test utility functions that we can extract from App.js

describe('App Utility Functions', () => {
  describe('Time Conversion', () => {
    // Helper function extracted from App.js for testing
    const to24Hour = (time, period) => {
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h < 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    test('converts 12:00 AM to 00:00', () => {
      expect(to24Hour('12:00', 'AM')).toBe('00:00');
    });

    test('converts 1:00 AM to 01:00', () => {
      expect(to24Hour('1:00', 'AM')).toBe('01:00');
    });

    test('converts 12:00 PM to 12:00', () => {
      expect(to24Hour('12:00', 'PM')).toBe('12:00');
    });

    test('converts 1:00 PM to 13:00', () => {
      expect(to24Hour('1:00', 'PM')).toBe('13:00');
    });

    test('converts 11:59 PM to 23:59', () => {
      expect(to24Hour('11:59', 'PM')).toBe('23:59');
    });
  });

  describe('Date Helper Functions', () => {
    const formatPrettyDate = (dateStr) => {
      const date = new Date(dateStr);
      const options = { 
        year: "numeric", 
        month: "short", 
        day: "numeric",
        timeZone: 'UTC'
      };
      return date.toLocaleDateString('en-US', options);
    };

    test('formats dates correctly', () => {
      // Test with a specific date
      const testDate = '2024-01-15T00:00:00.000Z';
      const result = formatPrettyDate(testDate);
      
      // Just check that the result contains the expected components
      // Don't rely on exact format since it can vary by environment
      expect(result).toContain('2024');
      expect(result).toMatch(/Jan/i);
      expect(result).toContain('15');
    });

    test('handles different date formats', () => {
      const testCases = [
        '2024-01-15',
        '2024-01-15T10:00:00',
        '2024-01-15T10:00:00.000Z'
      ];

      testCases.forEach(dateStr => {
        const result = formatPrettyDate(dateStr);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result).toContain('2024');
      });
    });
  });

  describe('Date Comparison', () => {
    const isSameDay = (dateStr, selectedDateStr = '2024-01-15') => {
      const appointmentDate = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      const selectedDateObj = new Date(selectedDateStr);
      return appointmentDate.toDateString() === selectedDateObj.toDateString();
    };

    test('returns true for same day', () => {
      expect(isSameDay('2024-01-15T10:00:00', '2024-01-15')).toBe(true);
    });

    test('returns false for different days', () => {
      expect(isSameDay('2024-01-16T10:00:00', '2024-01-15')).toBe(false);
    });

    test('handles Date objects', () => {
      const date = new Date('2024-01-15T10:00:00');
      expect(isSameDay(date, '2024-01-15')).toBe(true);
    });
  });

  describe('Input Validation', () => {
    const validateTimeInput = (time, period) => {
      if (!time || !period) return false;
      const timeRegex = /^([0-9]|1[0-2]):[0-5][0-9]$/;
      const validPeriods = ['AM', 'PM'];
      return timeRegex.test(time) && validPeriods.includes(period);
    };

    test('validates correct time format', () => {
      expect(validateTimeInput('10:30', 'AM')).toBe(true);
      expect(validateTimeInput('12:00', 'PM')).toBe(true);
      expect(validateTimeInput('1:15', 'AM')).toBe(true);
    });

    test('rejects invalid time format', () => {
      expect(validateTimeInput('25:00', 'AM')).toBe(false);
      expect(validateTimeInput('10:70', 'PM')).toBe(false);
      expect(validateTimeInput('10:30', 'XM')).toBe(false);
      expect(validateTimeInput('', 'AM')).toBe(false);
      expect(validateTimeInput('10:30', '')).toBe(false);
    });
  });
});
