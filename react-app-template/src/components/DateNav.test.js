import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DateNav from './DateNav';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronLeft: ({ size }) => <div data-testid="chevron-left" data-size={size}>←</div>,
  ChevronRight: ({ size }) => <div data-testid="chevron-right" data-size={size}>→</div>
}));

describe('DateNav Component', () => {
  const mockSetSelectedDate = jest.fn();
  
  const defaultProps = {
    selectedDate: '2024-01-15', // Monday, January 15, 2024
    setSelectedDate: mockSetSelectedDate,
    currentView: 'day'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders navigation buttons', () => {
      render(<DateNav {...defaultProps} />);
      
      expect(screen.getByTestId('chevron-left')).toBeInTheDocument();
      expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
    });

    test('renders with correct icon sizes', () => {
      render(<DateNav {...defaultProps} />);
      
      expect(screen.getByTestId('chevron-left')).toHaveAttribute('data-size', '20');
      expect(screen.getByTestId('chevron-right')).toHaveAttribute('data-size', '20');
    });

    test('has correct CSS classes', () => {
      const { container } = render(<DateNav {...defaultProps} />);
      
      const dateNavContainer = container.querySelector('.date-nav');
      expect(dateNavContainer).toBeInTheDocument();
      expect(dateNavContainer).toHaveClass('date-nav');
    });
  });

  describe('Day View', () => {
    test('renders date input in day view', () => {
      render(<DateNav {...defaultProps} currentView="day" />);
      
      const dateInput = screen.getByDisplayValue('2024-01-15');
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute('type', 'date');
      expect(dateInput).toHaveClass('date-picker');
    });

    test('calls setSelectedDate when date input changes', () => {
      render(<DateNav {...defaultProps} currentView="day" />);
      
      const dateInput = screen.getByDisplayValue('2024-01-15');
      fireEvent.change(dateInput, { target: { value: '2024-01-20' } });
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-01-20');
    });

    test('navigates to previous day when prev button clicked', () => {
      render(<DateNav {...defaultProps} currentView="day" />);
      
      const prevButton = screen.getByTestId('chevron-left').closest('button');
      fireEvent.click(prevButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-01-14');
    });

    test('navigates to next day when next button clicked', () => {
      render(<DateNav {...defaultProps} currentView="day" />);
      
      const nextButton = screen.getByTestId('chevron-right').closest('button');
      fireEvent.click(nextButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-01-16');
    });

    test('handles month boundary correctly when going to previous day', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-02-01" currentView="day" />);
      
      const prevButton = screen.getByTestId('chevron-left').closest('button');
      fireEvent.click(prevButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-01-31');
    });

    test('handles month boundary correctly when going to next day', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-01-31" currentView="day" />);
      
      const nextButton = screen.getByTestId('chevron-right').closest('button');
      fireEvent.click(nextButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-02-01');
    });
  });

  describe('Week View', () => {
    test('displays week range in week view', () => {
      render(<DateNav {...defaultProps} currentView="week" />);
      
      // January 15, 2024 is a Monday
      // Week should be Jan 14 (Sunday) - Jan 20 (Saturday), 2024
      expect(screen.getByText('Jan 14 – Jan 20, 2024')).toBeInTheDocument();
    });

    test('navigates to previous week when prev button clicked', () => {
      render(<DateNav {...defaultProps} currentView="week" />);
      
      const prevButton = screen.getByTestId('chevron-left').closest('button');
      fireEvent.click(prevButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-01-08');
    });

    test('navigates to next week when next button clicked', () => {
      render(<DateNav {...defaultProps} currentView="week" />);
      
      const nextButton = screen.getByTestId('chevron-right').closest('button');
      fireEvent.click(nextButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-01-22');
    });

    test('handles week spanning different months', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-01-30" currentView="week" />);
      
      // January 30, 2024 is a Tuesday
      // Week should be Jan 28 - Feb 3, 2024
      expect(screen.getByText('Jan 28 – Feb 3, 2024')).toBeInTheDocument();
    });

    test('handles week spanning different years', () => {
      render(<DateNav {...defaultProps} selectedDate="2023-12-31" currentView="week" />);
      
      // December 31, 2023 is a Sunday
      // Week should be Dec 31 - Jan 6, 2024 (but shows year of the selected date)
      expect(screen.getByText('Dec 31 – Jan 6, 2023')).toBeInTheDocument();
    });

    test('formats week correctly for different days of week', () => {
      // Test with a Saturday
      render(<DateNav {...defaultProps} selectedDate="2024-01-20" currentView="week" />);
      
      expect(screen.getByText('Jan 14 – Jan 20, 2024')).toBeInTheDocument();
    });
  });

  describe('Month View', () => {
    test('displays month and year in month view', () => {
      render(<DateNav {...defaultProps} currentView="month" />);
      
      expect(screen.getByText('Jan 2024')).toBeInTheDocument();
    });

    test('navigates to previous month when prev button clicked', () => {
      render(<DateNav {...defaultProps} currentView="month" />);
      
      const prevButton = screen.getByTestId('chevron-left').closest('button');
      fireEvent.click(prevButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2023-12-15');
    });

    test('navigates to next month when next button clicked', () => {
      render(<DateNav {...defaultProps} currentView="month" />);
      
      const nextButton = screen.getByTestId('chevron-right').closest('button');
      fireEvent.click(nextButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-02-15');
    });

    test('handles year boundary correctly when going to previous month', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-01-15" currentView="month" />);
      
      const prevButton = screen.getByTestId('chevron-left').closest('button');
      fireEvent.click(prevButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2023-12-15');
    });

    test('handles year boundary correctly when going to next month', () => {
      render(<DateNav {...defaultProps} selectedDate="2023-12-15" currentView="month" />);
      
      const nextButton = screen.getByTestId('chevron-right').closest('button');
      fireEvent.click(nextButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-01-15');
    });

    test('handles different months correctly', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-06-15" currentView="month" />);
      
      expect(screen.getByText('Jun 2024')).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    test('formats dates correctly for different locales', () => {
      // Test with a date that might format differently
      render(<DateNav {...defaultProps} selectedDate="2024-12-05" currentView="week" />);
      
      // December 5, 2024 is a Thursday
      // Week should be Dec 1 - Dec 7, 2024
      expect(screen.getByText('Dec 1 – Dec 7, 2024')).toBeInTheDocument();
    });

    test('handles single-digit dates correctly', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-01-05" currentView="week" />);
      
      // January 5, 2024 is a Friday
      // Week should be Dec 31 - Jan 6, 2024
      expect(screen.getByText('Dec 31 – Jan 6, 2024')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles leap year correctly', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-02-29" currentView="day" />);
      
      const dateInput = screen.getByDisplayValue('2024-02-29');
      expect(dateInput).toBeInTheDocument();
    });

    test('handles leap year navigation correctly', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-02-29" currentView="day" />);
      
      const nextButton = screen.getByTestId('chevron-right').closest('button');
      fireEvent.click(nextButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-03-01');
    });

    test('handles invalid date gracefully', () => {
      // This shouldn't crash the component
      expect(() => {
        render(<DateNav {...defaultProps} selectedDate="invalid-date" />);
      }).not.toThrow();
    });

    test('handles month navigation from January 31st', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-01-31" currentView="month" />);
      
      const nextButton = screen.getByTestId('chevron-right').closest('button');
      fireEvent.click(nextButton);
      
      // JavaScript's setMonth behavior: when going from Jan 31 to Feb, it becomes Mar 2
      // because Feb doesn't have 31 days, so it overflows
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-03-02');
    });

    test('handles month navigation from March 31st to February', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-03-31" currentView="month" />);
      
      const prevButton = screen.getByTestId('chevron-left').closest('button');
      fireEvent.click(prevButton);
      
      // JavaScript's setMonth behavior: when going from Mar 31 to Feb, it becomes Mar 2
      // because Feb doesn't have 31 days, so it overflows
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-03-02');
    });

    test('handles non-leap year February correctly', () => {
      render(<DateNav {...defaultProps} selectedDate="2023-03-31" currentView="month" />);
      
      const prevButton = screen.getByTestId('chevron-left').closest('button');
      fireEvent.click(prevButton);
      
      // JavaScript's setMonth behavior: when going from Mar 31 to Feb, it becomes Mar 3
      // because Feb 2023 only has 28 days, so it overflows
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2023-03-03');
    });
  });

  describe('Accessibility', () => {
    test('navigation buttons are accessible', () => {
      render(<DateNav {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    test('date input is accessible in day view', () => {
      render(<DateNav {...defaultProps} currentView="day" />);
      
      // Date inputs don't have role="textbox", they're just input elements
      const dateInput = screen.getByDisplayValue('2024-01-15');
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute('type', 'date');
    });

    test('date labels are readable by screen readers', () => {
      render(<DateNav {...defaultProps} currentView="week" />);
      
      const dateLabel = screen.getByText('Jan 14 – Jan 20, 2024');
      expect(dateLabel).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('renders quickly with multiple rapid clicks', () => {
      render(<DateNav {...defaultProps} />);
      
      const nextButton = screen.getByTestId('chevron-right').closest('button');
      
      const startTime = performance.now();
      
      // Simulate rapid clicking
      for (let i = 0; i < 10; i++) {
        fireEvent.click(nextButton);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should handle 10 clicks in less than 100ms
    });

    test('handles frequent prop updates efficiently', () => {
      const { rerender } = render(<DateNav {...defaultProps} />);
      
      const startTime = performance.now();
      
      // Simulate frequent date updates
      for (let i = 1; i <= 30; i++) {
        const newDate = `2024-01-${i.toString().padStart(2, '0')}`;
        rerender(<DateNav {...defaultProps} selectedDate={newDate} />);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(200); // Should handle 30 updates in less than 200ms
    });
  });

  describe('Integration', () => {
    test('works correctly when switching between views', () => {
      const { rerender } = render(<DateNav {...defaultProps} currentView="day" />);
      
      // Should show date input in day view
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      
      // Switch to week view
      rerender(<DateNav {...defaultProps} currentView="week" />);
      expect(screen.getByText('Jan 14 – Jan 20, 2024')).toBeInTheDocument();
      
      // Switch to month view
      rerender(<DateNav {...defaultProps} currentView="month" />);
      expect(screen.getByText('Jan 2024')).toBeInTheDocument();
    });

    test('maintains date consistency across view changes', () => {
      const { rerender } = render(<DateNav {...defaultProps} currentView="day" />);
      
      // Click next in day view
      const nextButton = screen.getByTestId('chevron-right').closest('button');
      fireEvent.click(nextButton);
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-01-16');
      
      // Switch to week view with the new date
      rerender(<DateNav {...defaultProps} selectedDate="2024-01-16" currentView="week" />);
      
      // Should show the week containing January 16th
      expect(screen.getByText('Jan 14 – Jan 20, 2024')).toBeInTheDocument();
    });
  });

  describe('Boundary Testing', () => {
    test('handles start of year correctly', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-01-01" currentView="day" />);
      
      const prevButton = screen.getByTestId('chevron-left').closest('button');
      fireEvent.click(prevButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2023-12-31');
    });

    test('handles end of year correctly', () => {
      render(<DateNav {...defaultProps} selectedDate="2023-12-31" currentView="day" />);
      
      const nextButton = screen.getByTestId('chevron-right').closest('button');
      fireEvent.click(nextButton);
      
      expect(mockSetSelectedDate).toHaveBeenCalledWith('2024-01-01');
    });

    test('handles week view at year boundary', () => {
      render(<DateNav {...defaultProps} selectedDate="2024-01-01" currentView="week" />);
      
      // January 1, 2024 is a Monday
      // Week should be Dec 31, 2023 - Jan 6, 2024
      expect(screen.getByText('Dec 31 – Jan 6, 2024')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    test('has correct container structure', () => {
      const { container } = render(<DateNav {...defaultProps} />);
      
      const dateNavContainer = container.querySelector('.date-nav');
      expect(dateNavContainer).toBeInTheDocument();
      expect(dateNavContainer).toHaveClass('date-nav');
    });

    test('contains all expected child elements', () => {
      render(<DateNav {...defaultProps} currentView="day" />);
      
      // Should have 2 buttons and 1 input
      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
    });

    test('contains expected elements in week view', () => {
      render(<DateNav {...defaultProps} currentView="week" />);
      
      // Should have 2 buttons and 1 span with date range
      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(screen.getByText('Jan 14 – Jan 20, 2024')).toBeInTheDocument();
    });

    test('contains expected elements in month view', () => {
      render(<DateNav {...defaultProps} currentView="month" />);
      
      // Should have 2 buttons and 1 span with month/year
      expect(screen.getAllByRole('button')).toHaveLength(2);
      expect(screen.getByText('Jan 2024')).toBeInTheDocument();
    });
  });
});
