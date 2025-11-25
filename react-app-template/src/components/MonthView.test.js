import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MonthView from './MonthView';

describe('MonthView Component', () => {
  const mockOnAppointmentClick = jest.fn();
  const mockGetStatus = jest.fn();

  const defaultProps = {
    appointments: [],
    selectedDate: new Date('2024-01-15T10:00:00.000Z'),
    onAppointmentClick: mockOnAppointmentClick,
    getStatus: mockGetStatus,
  };

  const sampleAppointments = [
    {
      id: 1,
      title: 'Morning Meeting',
      startTime: '2024-01-15T09:00:00.000Z',
      endTime: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 2,
      title: 'Lunch Break',
      startTime: '2024-01-15T12:00:00.000Z',
      endTime: '2024-01-15T13:00:00.000Z',
    },
    {
      id: 3,
      title: 'Team Standup',
      startTime: '2024-01-20T14:00:00.000Z',
      endTime: '2024-01-20T14:30:00.000Z',
    },
    {
      id: 4,
      title: 'Project Review',
      startTime: '2024-01-20T15:00:00.000Z',
      endTime: '2024-01-20T16:00:00.000Z',
    },
    {
      id: 5,
      title: 'Extra Meeting',
      startTime: '2024-01-20T16:30:00.000Z',
      endTime: '2024-01-20T17:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStatus.mockReturnValue('upcoming');
  });

  test('renders month view with correct structure', () => {
    const { container } = render(<MonthView {...defaultProps} />);
    
    expect(container.querySelector('.month-view')).toBeInTheDocument();
    expect(container.querySelector('.month-grid')).toBeInTheDocument();
  });

  test('renders all day headers correctly', () => {
    render(<MonthView {...defaultProps} />);
    
    const expectedDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    expectedDays.forEach(day => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  test('renders correct number of calendar cells', () => {
    const { container } = render(<MonthView {...defaultProps} />);
    
    // January 2024 starts on Monday (1), so we need 1 blank + 31 days = 32 cells minimum
    const cells = container.querySelectorAll('.month-cell');
    
    // Should have at least 31 cells for the days of January
    expect(cells.length).toBeGreaterThanOrEqual(31);
  });

  test('displays correct dates for the selected month', () => {
    render(<MonthView {...defaultProps} />);
    
    // Check that day 1 and day 31 are present for January 2024
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    
    // Check some dates in between
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  test('handles different months correctly', () => {
    // Test February 2024 (leap year)
    const { rerender } = render(<MonthView {...defaultProps} />);
    
    rerender(<MonthView {...defaultProps} selectedDate={new Date('2024-02-15T10:00:00.000Z')} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('29')).toBeInTheDocument(); // Leap year
    expect(screen.queryByText('30')).not.toBeInTheDocument();
    expect(screen.queryByText('31')).not.toBeInTheDocument();
  });

  test('handles non-leap year February correctly', () => {
    render(<MonthView {...defaultProps} selectedDate={new Date('2023-02-15T10:00:00.000Z')} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.queryByText('29')).not.toBeInTheDocument();
  });

  test('displays appointments on correct dates', () => {
    render(<MonthView {...defaultProps} appointments={sampleAppointments} />);
    
    // Check appointments on January 15th
    expect(screen.getByText('Morning Meeting')).toBeInTheDocument();
    expect(screen.getByText('Lunch Break')).toBeInTheDocument();
    
    // Check appointments on January 20th
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
    expect(screen.getByText('Project Review')).toBeInTheDocument();
  });

  test('limits appointments display to maximum of 2 per cell', () => {
    const { container } = render(<MonthView {...defaultProps} appointments={sampleAppointments} />);
    
    // Find the cell containing day 20
    const dayElements = container.querySelectorAll('.cell-date');
    const day20Element = Array.from(dayElements).find(el => el.textContent === '20');
    const jan20Cell = day20Element.closest('.month-cell');
    const appointmentsInCell = jan20Cell.querySelectorAll('.cell-appt');
    
    expect(appointmentsInCell).toHaveLength(2);
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
    expect(screen.getByText('Project Review')).toBeInTheDocument();
    expect(screen.queryByText('Extra Meeting')).not.toBeInTheDocument();
  });

  test('applies correct CSS classes to appointments', () => {
    mockGetStatus.mockReturnValue('completed');
    
    render(<MonthView {...defaultProps} appointments={sampleAppointments} />);
    
    const appointmentElement = screen.getByText('Morning Meeting');
    expect(appointmentElement).toHaveClass('cell-appt', 'completed');
  });

  test('calls getStatus for each appointment', () => {
    render(<MonthView {...defaultProps} appointments={sampleAppointments} />);
    
    // Should call getStatus for each visible appointment (max 2 per day)
    // Jan 15: 2 appointments, Jan 20: 2 appointments (limited)
    expect(mockGetStatus).toHaveBeenCalledTimes(4);
    
    expect(mockGetStatus).toHaveBeenCalledWith(sampleAppointments[0]);
    expect(mockGetStatus).toHaveBeenCalledWith(sampleAppointments[1]);
    expect(mockGetStatus).toHaveBeenCalledWith(sampleAppointments[2]);
    expect(mockGetStatus).toHaveBeenCalledWith(sampleAppointments[3]);
  });

  test('calls onAppointmentClick when appointment is clicked', () => {
    render(<MonthView {...defaultProps} appointments={sampleAppointments} />);
    
    const appointmentElement = screen.getByText('Morning Meeting');
    fireEvent.click(appointmentElement);
    
    expect(mockOnAppointmentClick).toHaveBeenCalledTimes(1);
    expect(mockOnAppointmentClick).toHaveBeenCalledWith(sampleAppointments[0]);
  });

  test('handles multiple appointment clicks correctly', () => {
    render(<MonthView {...defaultProps} appointments={sampleAppointments} />);
    
    fireEvent.click(screen.getByText('Morning Meeting'));
    fireEvent.click(screen.getByText('Team Standup'));
    
    expect(mockOnAppointmentClick).toHaveBeenCalledTimes(2);
    expect(mockOnAppointmentClick).toHaveBeenNthCalledWith(1, sampleAppointments[0]);
    expect(mockOnAppointmentClick).toHaveBeenNthCalledWith(2, sampleAppointments[2]);
  });

  test('filters appointments correctly by date', () => {
    const appointmentsWithDifferentMonths = [
      ...sampleAppointments,
      {
        id: 6,
        title: 'February Meeting',
        startTime: '2024-02-15T10:00:00.000Z',
        endTime: '2024-02-15T11:00:00.000Z',
      },
      {
        id: 7,
        title: 'December Meeting',
        startTime: '2023-12-15T10:00:00.000Z',
        endTime: '2023-12-15T11:00:00.000Z',
      },
    ];
    
    render(<MonthView {...defaultProps} appointments={appointmentsWithDifferentMonths} />);
    
    // Should only show January 2024 appointments
    expect(screen.getByText('Morning Meeting')).toBeInTheDocument();
    expect(screen.queryByText('February Meeting')).not.toBeInTheDocument();
    expect(screen.queryByText('December Meeting')).not.toBeInTheDocument();
  });

  test('handles empty appointments array', () => {
    const { container } = render(<MonthView {...defaultProps} appointments={[]} />);
    
    // Should still render the calendar structure
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    
    // Should not have any appointment elements
    const appointmentElements = container.querySelectorAll('.cell-appt');
    expect(appointmentElements).toHaveLength(0);
  });

  test('handles appointments with same start time correctly', () => {
    const sameTimeAppointments = [
      {
        id: 1,
        title: 'Meeting A',
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T11:00:00.000Z',
      },
      {
        id: 2,
        title: 'Meeting B',
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T11:00:00.000Z',
      },
    ];
    
    render(<MonthView {...defaultProps} appointments={sameTimeAppointments} />);
    
    expect(screen.getByText('Meeting A')).toBeInTheDocument();
    expect(screen.getByText('Meeting B')).toBeInTheDocument();
  });

  test('memoizes days array correctly', () => {
    const { rerender } = render(<MonthView {...defaultProps} />);
    
    // Re-render with same date - should use memoized value
    rerender(<MonthView {...defaultProps} />);
    
    // Calendar should still render correctly
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  test('recalculates days array when date changes', () => {
    const { rerender } = render(<MonthView {...defaultProps} />);
    
    // Should show January dates
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.queryByText('30')).toBeInTheDocument();
    
    // Change to February
    rerender(<MonthView {...defaultProps} selectedDate={new Date('2024-02-15T10:00:00.000Z')} />);
    
    // Should show February dates
    expect(screen.queryByText('31')).not.toBeInTheDocument();
    expect(screen.getByText('29')).toBeInTheDocument(); // Leap year
  });

  test('handles edge case dates correctly', () => {
    // Test January 1st, 2024 (Monday)
    render(<MonthView {...defaultProps} selectedDate={new Date('2024-01-01T00:00:00.000Z')} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
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
    
    render(<MonthView {...defaultProps} appointments={midnightAppointments} />);
    
    // Should appear on the start date
    expect(screen.getByText('Late Night Meeting')).toBeInTheDocument();
  });

  test('renders empty cells for days before month start', () => {
    const { container } = render(<MonthView {...defaultProps} />);
    
    // January 2024 starts on Monday, so Sunday should be empty
    const cells = container.querySelectorAll('.month-cell');
    
    // First cell should be empty (Sunday before Jan 1st)
    const firstCell = cells[0];
    expect(firstCell.textContent).toBe('');
  });

  test('applies correct CSS classes to different appointment statuses', () => {
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
        startTime: '2024-01-20T14:00:00.000Z',
        endTime: '2024-01-20T15:00:00.000Z',
      },
    ];
    
    render(<MonthView {...defaultProps} appointments={statusAppointments} />);
    
    expect(screen.getByText('Upcoming Meeting')).toHaveClass('cell-appt', 'upcoming');
    expect(screen.getByText('Completed Meeting')).toHaveClass('cell-appt', 'completed');
    expect(screen.getByText('Cancelled Meeting')).toHaveClass('cell-appt', 'cancelled');
  });
});
