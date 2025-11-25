import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WeekView from './WeekView';

// Mock the AppointmentBlock component
jest.mock('./AppointmentBlock', () => {
  return function MockAppointmentBlock({ appointment, onClick, getStatus }) {
    const status = getStatus(appointment);
    return (
      <div 
        className={`appointment-block ${status}`}
        onClick={onClick}
        data-testid={`appointment-${appointment.id}`}
      >
        {appointment.title}
      </div>
    );
  };
});

describe('WeekView Component', () => {
  const mockOnAppointmentClick = jest.fn();
  const mockGetStatus = jest.fn();

  const defaultProps = {
    appointments: [],
    selectedDate: new Date('2024-01-15T10:00:00.000Z'), // Monday, January 15, 2024
    onAppointmentClick: mockOnAppointmentClick,
    getStatus: mockGetStatus,
  };

  const sampleAppointments = [
    {
      id: 1,
      title: 'Monday Meeting',
      startTime: '2024-01-15T09:00:00.000Z', // Monday Jan 15
      endTime: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 2,
      title: 'Monday Lunch',
      startTime: '2024-01-15T12:00:00.000Z', // Monday Jan 15
      endTime: '2024-01-15T13:00:00.000Z',
    },
    {
      id: 3,
      title: 'Wednesday Standup',
      startTime: '2024-01-17T14:00:00.000Z', // Wednesday Jan 17
      endTime: '2024-01-17T14:30:00.000Z',
    },
    {
      id: 4,
      title: 'Friday Review',
      startTime: '2024-01-19T15:00:00.000Z', // Friday Jan 19
      endTime: '2024-01-19T16:00:00.000Z',
    },
    {
      id: 5,
      title: 'Sunday Planning',
      startTime: '2024-01-14T10:00:00.000Z', // Sunday Jan 14 (same week)
      endTime: '2024-01-14T11:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStatus.mockReturnValue('upcoming');
  });

  test('renders week view with correct structure', () => {
    const { container } = render(<WeekView {...defaultProps} />);
    
    expect(container.querySelector('.week-view')).toBeInTheDocument();
    expect(container.querySelector('.week-grid')).toBeInTheDocument();
  });

  test('renders 7 days in the week', () => {
    const { container } = render(<WeekView {...defaultProps} />);
    
    const weekDays = container.querySelectorAll('.week-day');
    expect(weekDays).toHaveLength(7);
  });

  test('displays correct day headers for the week', () => {
    render(<WeekView {...defaultProps} />);
    
    // Week starting Sunday Jan 14, 2024 to Saturday Jan 20, 2024
    expect(screen.getByText('Sun, Jan 14')).toBeInTheDocument();
    expect(screen.getByText('Mon, Jan 15')).toBeInTheDocument();
    expect(screen.getByText('Tue, Jan 16')).toBeInTheDocument();
    expect(screen.getByText('Wed, Jan 17')).toBeInTheDocument();
    expect(screen.getByText('Thu, Jan 18')).toBeInTheDocument();
    expect(screen.getByText('Fri, Jan 19')).toBeInTheDocument();
    expect(screen.getByText('Sat, Jan 20')).toBeInTheDocument();
  });

  test('calculates week start correctly for different days', () => {
    // Test with different days of the week
    const { rerender } = render(<WeekView {...defaultProps} />);
    
    // Test with Wednesday (should still show same week)
    rerender(<WeekView {...defaultProps} selectedDate={new Date('2024-01-17T10:00:00.000Z')} />);
    expect(screen.getByText('Sun, Jan 14')).toBeInTheDocument();
    expect(screen.getByText('Sat, Jan 20')).toBeInTheDocument();
    
    // Test with Sunday (should show same week)
    rerender(<WeekView {...defaultProps} selectedDate={new Date('2024-01-14T10:00:00.000Z')} />);
    expect(screen.getByText('Sun, Jan 14')).toBeInTheDocument();
    expect(screen.getByText('Sat, Jan 20')).toBeInTheDocument();
  });

  test('shows different week when date changes to different week', () => {
    const { rerender } = render(<WeekView {...defaultProps} />);
    
    // Change to next week
    rerender(<WeekView {...defaultProps} selectedDate={new Date('2024-01-22T10:00:00.000Z')} />);
    
    expect(screen.getByText('Sun, Jan 21')).toBeInTheDocument();
    expect(screen.getByText('Mon, Jan 22')).toBeInTheDocument();
    expect(screen.getByText('Sat, Jan 27')).toBeInTheDocument();
  });

  test('displays appointments on correct days', () => {
    render(<WeekView {...defaultProps} appointments={sampleAppointments} />);
    
    expect(screen.getByText('Monday Meeting')).toBeInTheDocument();
    expect(screen.getByText('Monday Lunch')).toBeInTheDocument();
    expect(screen.getByText('Wednesday Standup')).toBeInTheDocument();
    expect(screen.getByText('Friday Review')).toBeInTheDocument();
    expect(screen.getByText('Sunday Planning')).toBeInTheDocument();
  });

  test('groups appointments by day correctly', () => {
    const { container } = render(<WeekView {...defaultProps} appointments={sampleAppointments} />);
    
    const weekDays = container.querySelectorAll('.week-day');
    
    // Sunday (index 0) should have 1 appointment
    const sundayAppointments = weekDays[0].querySelectorAll('[data-testid^="appointment-"]');
    expect(sundayAppointments).toHaveLength(1);
    
    // Monday (index 1) should have 2 appointments
    const mondayAppointments = weekDays[1].querySelectorAll('[data-testid^="appointment-"]');
    expect(mondayAppointments).toHaveLength(2);
    
    // Tuesday (index 2) should have 0 appointments
    const tuesdayAppointments = weekDays[2].querySelectorAll('[data-testid^="appointment-"]');
    expect(tuesdayAppointments).toHaveLength(0);
    
    // Wednesday (index 3) should have 1 appointment
    const wednesdayAppointments = weekDays[3].querySelectorAll('[data-testid^="appointment-"]');
    expect(wednesdayAppointments).toHaveLength(1);
    
    // Friday (index 5) should have 1 appointment
    const fridayAppointments = weekDays[5].querySelectorAll('[data-testid^="appointment-"]');
    expect(fridayAppointments).toHaveLength(1);
  });

  test('shows "No appointments" message for days without appointments', () => {
    render(<WeekView {...defaultProps} appointments={sampleAppointments} />);
    
    // Should show "No appointments" for days without any appointments
    const noAppointmentMessages = screen.getAllByText('No appointments');
    expect(noAppointmentMessages.length).toBeGreaterThan(0);
  });

  test('shows "No appointments" for all days when appointments array is empty', () => {
    render(<WeekView {...defaultProps} appointments={[]} />);
    
    const noAppointmentMessages = screen.getAllByText('No appointments');
    expect(noAppointmentMessages).toHaveLength(7); // One for each day
  });

  test('passes correct props to AppointmentBlock components', () => {
    render(<WeekView {...defaultProps} appointments={sampleAppointments} />);
    
    // Check that AppointmentBlock is rendered with correct props
    expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
    expect(screen.getByTestId('appointment-2')).toBeInTheDocument();
    expect(screen.getByTestId('appointment-3')).toBeInTheDocument();
    expect(screen.getByTestId('appointment-4')).toBeInTheDocument();
    expect(screen.getByTestId('appointment-5')).toBeInTheDocument();
  });

  test('calls getStatus for each appointment', () => {
    render(<WeekView {...defaultProps} appointments={sampleAppointments} />);
    
    expect(mockGetStatus).toHaveBeenCalledTimes(5);
    expect(mockGetStatus).toHaveBeenCalledWith(sampleAppointments[0]);
    expect(mockGetStatus).toHaveBeenCalledWith(sampleAppointments[1]);
    expect(mockGetStatus).toHaveBeenCalledWith(sampleAppointments[2]);
    expect(mockGetStatus).toHaveBeenCalledWith(sampleAppointments[3]);
    expect(mockGetStatus).toHaveBeenCalledWith(sampleAppointments[4]);
  });

  test('calls onAppointmentClick when appointment is clicked', () => {
    render(<WeekView {...defaultProps} appointments={sampleAppointments} />);
    
    const appointmentElement = screen.getByTestId('appointment-1');
    fireEvent.click(appointmentElement);
    
    expect(mockOnAppointmentClick).toHaveBeenCalledTimes(1);
    expect(mockOnAppointmentClick).toHaveBeenCalledWith(sampleAppointments[0]);
  });

  test('handles multiple appointment clicks correctly', () => {
    render(<WeekView {...defaultProps} appointments={sampleAppointments} />);
    
    fireEvent.click(screen.getByTestId('appointment-1'));
    fireEvent.click(screen.getByTestId('appointment-3'));
    
    expect(mockOnAppointmentClick).toHaveBeenCalledTimes(2);
    expect(mockOnAppointmentClick).toHaveBeenNthCalledWith(1, sampleAppointments[0]);
    expect(mockOnAppointmentClick).toHaveBeenNthCalledWith(2, sampleAppointments[2]);
  });

  test('filters appointments correctly by date', () => {
    const appointmentsWithDifferentWeeks = [
      ...sampleAppointments,
      {
        id: 6,
        title: 'Next Week Meeting',
        startTime: '2024-01-22T10:00:00.000Z', // Next week
        endTime: '2024-01-22T11:00:00.000Z',
      },
      {
        id: 7,
        title: 'Previous Week Meeting',
        startTime: '2024-01-08T10:00:00.000Z', // Previous week
        endTime: '2024-01-08T11:00:00.000Z',
      },
    ];
    
    render(<WeekView {...defaultProps} appointments={appointmentsWithDifferentWeeks} />);
    
    // Should only show current week appointments
    expect(screen.getByText('Monday Meeting')).toBeInTheDocument();
    expect(screen.queryByText('Next Week Meeting')).not.toBeInTheDocument();
    expect(screen.queryByText('Previous Week Meeting')).not.toBeInTheDocument();
  });

  test('handles appointments at different times on same day', () => {
    const sameDayAppointments = [
      {
        id: 1,
        title: 'Morning Meeting',
        startTime: '2024-01-15T09:00:00.000Z',
        endTime: '2024-01-15T10:00:00.000Z',
      },
      {
        id: 2,
        title: 'Afternoon Meeting',
        startTime: '2024-01-15T14:00:00.000Z',
        endTime: '2024-01-15T15:00:00.000Z',
      },
      {
        id: 3,
        title: 'Evening Meeting',
        startTime: '2024-01-15T18:00:00.000Z',
        endTime: '2024-01-15T19:00:00.000Z',
      },
    ];
    
    render(<WeekView {...defaultProps} appointments={sameDayAppointments} />);
    
    expect(screen.getByText('Morning Meeting')).toBeInTheDocument();
    expect(screen.getByText('Afternoon Meeting')).toBeInTheDocument();
    expect(screen.getByText('Evening Meeting')).toBeInTheDocument();
  });

  test('handles appointments spanning midnight correctly', () => {
    const midnightAppointments = [
      {
        id: 1,
        title: 'Late Night Meeting',
        startTime: '2024-01-15T23:30:00.000Z',
        endTime: '2024-01-16T01:00:00.000Z',
      },
    ];
    
    render(<WeekView {...defaultProps} appointments={midnightAppointments} />);
    
    // Should appear on the start date (Monday)
    expect(screen.getByText('Late Night Meeting')).toBeInTheDocument();
  });

  test('memoizes appointmentsByDay correctly', () => {
    const { rerender } = render(<WeekView {...defaultProps} appointments={sampleAppointments} />);
    
    // Re-render with same props - should use memoized value
    rerender(<WeekView {...defaultProps} appointments={sampleAppointments} />);
    
    // Appointments should still render correctly
    expect(screen.getByText('Monday Meeting')).toBeInTheDocument();
    expect(screen.getByText('Wednesday Standup')).toBeInTheDocument();
  });

  test('recalculates appointmentsByDay when appointments change', () => {
    const { rerender } = render(<WeekView {...defaultProps} appointments={sampleAppointments} />);
    
    expect(screen.getByText('Monday Meeting')).toBeInTheDocument();
    
    const newAppointments = [
      {
        id: 10,
        title: 'New Tuesday Meeting',
        startTime: '2024-01-16T10:00:00.000Z',
        endTime: '2024-01-16T11:00:00.000Z',
      },
    ];
    
    rerender(<WeekView {...defaultProps} appointments={newAppointments} />);
    
    expect(screen.queryByText('Monday Meeting')).not.toBeInTheDocument();
    expect(screen.getByText('New Tuesday Meeting')).toBeInTheDocument();
  });

  test('handles different date formats correctly', () => {
    // Test with string date
    const { rerender } = render(<WeekView {...defaultProps} selectedDate="2024-01-15" />);
    expect(screen.getByText('Mon, Jan 15')).toBeInTheDocument();
    
    // Test with Date object
    rerender(<WeekView {...defaultProps} selectedDate={new Date('2024-01-15T10:00:00.000Z')} />);
    expect(screen.getByText('Mon, Jan 15')).toBeInTheDocument();
  });

  test('handles edge cases for week calculation', () => {
    // Test with first day of year
    render(<WeekView {...defaultProps} selectedDate={new Date('2024-01-01T10:00:00.000Z')} />);
    
    // Should show the week containing January 1st
    expect(screen.getByText('Mon, Jan 1')).toBeInTheDocument();
  });

  test('handles leap year dates correctly', () => {
    // Test February 29th in leap year
    render(<WeekView {...defaultProps} selectedDate={new Date('2024-02-29T10:00:00.000Z')} />);
    
    expect(screen.getByText('Thu, Feb 29')).toBeInTheDocument();
  });

  test('applies correct CSS classes', () => {
    const { container } = render(<WeekView {...defaultProps} appointments={sampleAppointments} />);
    
    expect(container.querySelector('.week-view')).toBeInTheDocument();
    expect(container.querySelector('.week-grid')).toBeInTheDocument();
    
    const dayHeaders = container.querySelectorAll('.day-header');
    expect(dayHeaders).toHaveLength(7);
    
    const dayAppointments = container.querySelectorAll('.day-appointments');
    expect(dayAppointments).toHaveLength(7);
  });

  test('handles appointments with different statuses', () => {
    mockGetStatus
      .mockReturnValueOnce('upcoming')
      .mockReturnValueOnce('completed')
      .mockReturnValueOnce('cancelled');
    
    const statusAppointments = [
      {
        id: 1,
        title: 'Upcoming Meeting',
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T11:00:00.000Z',
      },
      {
        id: 2,
        title: 'Completed Meeting',
        startTime: '2024-01-15T12:00:00.000Z',
        endTime: '2024-01-15T13:00:00.000Z',
      },
      {
        id: 3,
        title: 'Cancelled Meeting',
        startTime: '2024-01-17T14:00:00.000Z',
        endTime: '2024-01-17T15:00:00.000Z',
      },
    ];
    
    render(<WeekView {...defaultProps} appointments={statusAppointments} />);
    
    expect(screen.getByTestId('appointment-1')).toHaveClass('upcoming');
    expect(screen.getByTestId('appointment-2')).toHaveClass('completed');
    expect(screen.getByTestId('appointment-3')).toHaveClass('cancelled');
  });

  test('handles empty appointment titles gracefully', () => {
    const appointmentsWithEmptyTitles = [
      {
        id: 1,
        title: '',
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T11:00:00.000Z',
      },
      {
        id: 2,
        title: null,
        startTime: '2024-01-15T12:00:00.000Z',
        endTime: '2024-01-15T13:00:00.000Z',
      },
    ];
    
    render(<WeekView {...defaultProps} appointments={appointmentsWithEmptyTitles} />);
    
    expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
    expect(screen.getByTestId('appointment-2')).toBeInTheDocument();
  });

  test('handles appointments on next Sunday correctly', () => {
    const nextSundayAppointments = [
      {
        id: 1,
        title: 'Next Sunday Meeting',
        startTime: '2024-01-21T10:00:00.000Z', // Next Sunday
        endTime: '2024-01-21T11:00:00.000Z',
      },
    ];
    
    // Change selected date to next week to see the appointment
    render(<WeekView {...defaultProps} selectedDate={new Date('2024-01-21T10:00:00.000Z')} appointments={nextSundayAppointments} />);
    
    expect(screen.getByText('Next Sunday Meeting')).toBeInTheDocument();
  });
});
