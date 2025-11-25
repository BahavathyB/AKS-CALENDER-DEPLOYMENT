import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';

// Mock the DateNav component
jest.mock('./DateNav', () => {
  return function MockDateNav({ selectedDate, setSelectedDate, currentView }) {
    return (
      <div data-testid="date-nav">
        <div>Selected: {selectedDate}</div>
        <div>View: {currentView}</div>
        <button onClick={() => setSelectedDate('2024-01-16')}>
          Change Date
        </button>
      </div>
    );
  };
});

// Mock window.innerWidth
const mockInnerWidth = (width) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

describe('Sidebar Component', () => {
  const mockAppointments = [
    {
      id: 1,
      title: 'Team Meeting',
      startTime: '2024-01-15T10:00:00',
      endTime: '2024-01-15T11:00:00',
      type: 'Meeting'
    },
    {
      id: 2,
      title: 'Personal Task',
      startTime: '2024-01-15T14:00:00',
      endTime: '2024-01-15T15:00:00',
      type: 'Personal'
    },
    {
      id: 3,
      title: 'Project Deadline',
      startTime: '2024-01-15T16:00:00',
      endTime: '2024-01-15T17:00:00',
      type: 'Deadline'
    },
    {
      id: 4,
      title: 'Follow-up Call',
      startTime: '2024-01-16T09:00:00',
      endTime: '2024-01-16T10:00:00',
      type: 'Follow-up'
    }
  ];

  const mockProps = {
    appointments: mockAppointments,
    selectedDate: '2024-01-15',
    setSelectedDate: jest.fn(),
    isSameDay: jest.fn(),
    getStatus: jest.fn(),
    currentView: 'day',
    loggedInUser: {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      timeZoneId: 'America/New_York'
    }
  };

  // Mock console.log to avoid test output noise
  const originalConsoleLog = console.log;
  
  beforeAll(() => {
    console.log = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to desktop width
    mockInnerWidth(1024);
    
    // Default mock implementations
    mockProps.isSameDay.mockImplementation((appointmentDate, selectedDate) => {
      const apptDate = new Date(appointmentDate).toDateString();
      const selDate = new Date(selectedDate).toDateString();
      return apptDate === selDate;
    });
    
    mockProps.getStatus.mockReturnValue('upcoming');
  });

  describe('Basic Rendering', () => {
    test('renders sidebar with header and user greeting', () => {
      render(<Sidebar {...mockProps} />);
      
      expect(screen.getByText('📅 Appointments')).toBeInTheDocument();
      expect(screen.getByText('Manage your schedule')).toBeInTheDocument();
      expect(screen.getByText('Welcome, John!')).toBeInTheDocument();
      expect(screen.getByText('America/New_York')).toBeInTheDocument();
    });

    test('renders without user when loggedInUser is null', () => {
      render(<Sidebar {...mockProps} loggedInUser={null} />);
      
      expect(screen.getByText('📅 Appointments')).toBeInTheDocument();
      expect(screen.queryByText('Welcome, John!')).not.toBeInTheDocument();
    });

    test('renders DateNav component with correct props', () => {
      render(<Sidebar {...mockProps} />);
      
      expect(screen.getByTestId('date-nav')).toBeInTheDocument();
      expect(screen.getByText('Selected: 2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('View: day')).toBeInTheDocument();
    });

    test('renders color legend with all appointment types', () => {
      render(<Sidebar {...mockProps} />);
      
      expect(screen.getByText('Meeting')).toBeInTheDocument();
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Deadline')).toBeInTheDocument();
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
      
      // Check that legend has proper ARIA attributes
      expect(screen.getByRole('list', { name: 'Appointment color codes' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(4);
    });
  });

  describe('Appointment Filtering and Display', () => {
    test('displays upcoming appointments for selected date', () => {
      render(<Sidebar {...mockProps} />);
      
      expect(screen.getByText('Recent & Upcoming')).toBeInTheDocument();
      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
      expect(screen.getByText('Personal Task')).toBeInTheDocument();
      expect(screen.getByText('Project Deadline')).toBeInTheDocument();
      
      // Should not show appointment from different date
      expect(screen.queryByText('Follow-up Call')).not.toBeInTheDocument();
    });

    test('filters appointments correctly using isSameDay function', () => {
      mockProps.isSameDay.mockImplementation((appointmentDate, selectedDate) => {
        // Only return true for first appointment
        return appointmentDate === '2024-01-15T10:00:00';
      });

      render(<Sidebar {...mockProps} />);
      
      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
      expect(screen.queryByText('Personal Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Project Deadline')).not.toBeInTheDocument();
      
      expect(mockProps.isSameDay).toHaveBeenCalledWith('2024-01-15T10:00:00', '2024-01-15');
    });

    test('only shows upcoming appointments based on getStatus', () => {
      mockProps.getStatus.mockImplementation((startTime) => {
        // Only first appointment is upcoming
        return startTime === '2024-01-15T10:00:00' ? 'upcoming' : 'past';
      });

      render(<Sidebar {...mockProps} />);
      
      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
      expect(screen.queryByText('Personal Task')).not.toBeInTheDocument();
      expect(screen.queryByText('Project Deadline')).not.toBeInTheDocument();
    });

    test('displays appointment times in correct format', () => {
      render(<Sidebar {...mockProps} />);
      
      // Check for time format - the component renders lowercase am/pm
      expect(screen.getByText('10:00 am')).toBeInTheDocument();
      expect(screen.getByText('02:00 pm')).toBeInTheDocument();
      expect(screen.getByText('04:00 pm')).toBeInTheDocument();
    });

    test('shows "Upcoming" label for all displayed appointments', () => {
      render(<Sidebar {...mockProps} />);
      
      const upcomingLabels = screen.getAllByText('Upcoming');
      expect(upcomingLabels).toHaveLength(3); // 3 appointments for selected date
    });

    test('handles empty appointments array', () => {
      render(<Sidebar {...mockProps} appointments={[]} />);
      
      expect(screen.getByText('Recent & Upcoming')).toBeInTheDocument();
      expect(screen.queryByText('Team Meeting')).not.toBeInTheDocument();
    });
  });

  describe('Desktop Behavior', () => {
    beforeEach(() => {
      mockInnerWidth(1024);
    });

    test('shows collapse button on desktop', () => {
      render(<Sidebar {...mockProps} />);
      
      const collapseButton = screen.getByText('«');
      expect(collapseButton).toBeInTheDocument();
      expect(screen.queryByText('☰')).not.toBeInTheDocument();
    });

    test('toggles collapsed state on desktop', async () => {
      const user = userEvent.setup();
      render(<Sidebar {...mockProps} />);
      
      const collapseButton = screen.getByText('«');
      
      // Initially expanded
      expect(screen.getByText('📅 Appointments')).toBeInTheDocument();
      
      // Click to collapse
      await user.click(collapseButton);
      
      // Should show expand button
      expect(screen.getByText('»')).toBeInTheDocument();
      
      // Content should still be in DOM but sidebar should have 'closed' class
      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toHaveClass('closed');
    });

    test('expands from collapsed state', async () => {
      const user = userEvent.setup();
      render(<Sidebar {...mockProps} />);
      
      const collapseButton = screen.getByText('«');
      
      // Collapse first
      await user.click(collapseButton);
      expect(screen.getByText('»')).toBeInTheDocument();
      
      // Expand again
      const expandButton = screen.getByText('»');
      await user.click(expandButton);
      
      expect(screen.getByText('«')).toBeInTheDocument();
      const sidebar = screen.getByRole('complementary');
      expect(sidebar).not.toHaveClass('closed');
    });
  });

  describe('Mobile Behavior', () => {
    beforeEach(() => {
      mockInnerWidth(600);
    });

    test('shows hamburger button on mobile', () => {
      render(<Sidebar {...mockProps} />);
      
      expect(screen.getByText('☰')).toBeInTheDocument();
      expect(screen.queryByText('«')).not.toBeInTheDocument();
    });

    test('opens mobile sidebar when hamburger is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar {...mockProps} />);
      
      const hamburgerButton = screen.getByText('☰');
      
      // Initially closed on mobile
      const sidebar = screen.getByRole('complementary');
      expect(sidebar).not.toHaveClass('open');
      
      // Click to open
      await user.click(hamburgerButton);
      
      expect(sidebar).toHaveClass('open');
    });

    test('shows overlay when mobile sidebar is open', async () => {
      const user = userEvent.setup();
      render(<Sidebar {...mockProps} />);
      
      const hamburgerButton = screen.getByText('☰');
      await user.click(hamburgerButton);
      
      const overlay = document.querySelector('.sidebar-overlay');
      expect(overlay).toHaveClass('active');
    });

    test('closes mobile sidebar when overlay is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar {...mockProps} />);
      
      const hamburgerButton = screen.getByText('☰');
      await user.click(hamburgerButton);
      
      // Sidebar should be open
      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toHaveClass('open');
      
      // Click overlay to close
      const overlay = document.querySelector('.sidebar-overlay');
      await user.click(overlay);
      
      expect(sidebar).not.toHaveClass('open');
    });
  });

  describe('Responsive Behavior', () => {
    test('handles window resize from desktop to mobile', async () => {
      render(<Sidebar {...mockProps} />);
      
      // Initially desktop
      expect(screen.getByText('«')).toBeInTheDocument();
      expect(screen.queryByText('☰')).not.toBeInTheDocument();
      
      // Resize to mobile
      mockInnerWidth(600);
      fireEvent(window, new Event('resize'));
      
      await waitFor(() => {
        expect(screen.getByText('☰')).toBeInTheDocument();
        expect(screen.queryByText('«')).not.toBeInTheDocument();
      });
    });

    test('handles window resize from mobile to desktop', async () => {
      mockInnerWidth(600);
      render(<Sidebar {...mockProps} />);
      
      // Initially mobile
      expect(screen.getByText('☰')).toBeInTheDocument();
      
      // Resize to desktop
      mockInnerWidth(1024);
      fireEvent(window, new Event('resize'));
      
      await waitFor(() => {
        expect(screen.getByText('«')).toBeInTheDocument();
        expect(screen.queryByText('☰')).not.toBeInTheDocument();
      });
    });

    test('cleans up resize event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<Sidebar {...mockProps} />);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('DateNav Integration', () => {
    test('passes correct props to DateNav', () => {
      render(<Sidebar {...mockProps} currentView="week" />);
      
      expect(screen.getByText('Selected: 2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('View: week')).toBeInTheDocument();
    });

    test('calls setSelectedDate when DateNav triggers change', async () => {
      const user = userEvent.setup();
      render(<Sidebar {...mockProps} />);
      
      const changeDateButton = screen.getByText('Change Date');
      await user.click(changeDateButton);
      
      expect(mockProps.setSelectedDate).toHaveBeenCalledWith('2024-01-16');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels and roles', () => {
      render(<Sidebar {...mockProps} />);
      
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      expect(screen.getByRole('list', { name: 'Appointment color codes' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(4);
    });

    test('hamburger button is accessible', () => {
      mockInnerWidth(600);
      render(<Sidebar {...mockProps} />);
      
      const hamburgerButton = screen.getByText('☰');
      expect(hamburgerButton).toBeInTheDocument();
      expect(hamburgerButton.tagName).toBe('BUTTON');
    });

    test('collapse button is accessible', () => {
      render(<Sidebar {...mockProps} />);
      
      const collapseButton = screen.getByText('«');
      expect(collapseButton).toBeInTheDocument();
      expect(collapseButton.tagName).toBe('BUTTON');
    });
  });

  describe('Edge Cases', () => {
    test('handles appointments with missing type', () => {
      const appointmentsWithMissingType = [
        {
          id: 1,
          title: 'No Type Meeting',
          startTime: '2024-01-15T10:00:00',
          endTime: '2024-01-15T11:00:00'
          // type is missing
        }
      ];

      render(<Sidebar {...mockProps} appointments={appointmentsWithMissingType} />);
      
      expect(screen.getByText('No Type Meeting')).toBeInTheDocument();
    });

    test('handles invalid date strings gracefully', () => {
      const appointmentsWithInvalidDate = [
        {
          id: 1,
          title: 'Invalid Date Meeting',
          startTime: 'invalid-date',
          endTime: '2024-01-15T11:00:00',
          type: 'Meeting'
        }
      ];

      // Should not crash
      expect(() => {
        render(<Sidebar {...mockProps} appointments={appointmentsWithInvalidDate} />);
      }).not.toThrow();
    });

    test('handles very long appointment titles', () => {
      const appointmentsWithLongTitle = [
        {
          id: 1,
          title: 'This is a very long appointment title that might cause layout issues if not handled properly',
          startTime: '2024-01-15T10:00:00',
          endTime: '2024-01-15T11:00:00',
          type: 'Meeting'
        }
      ];

      render(<Sidebar {...mockProps} appointments={appointmentsWithLongTitle} />);
      
      expect(screen.getByText(/This is a very long appointment title/)).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    test('shows content when desktop and not collapsed', () => {
      mockInnerWidth(1024);
      render(<Sidebar {...mockProps} />);
      
      expect(screen.getByText('📅 Appointments')).toBeInTheDocument();
      expect(screen.getByText('Recent & Upcoming')).toBeInTheDocument();
    });

    test('hides content when desktop and collapsed', async () => {
      const user = userEvent.setup();
      mockInnerWidth(1024);
      render(<Sidebar {...mockProps} />);
      
      const collapseButton = screen.getByText('«');
      await user.click(collapseButton);
      
      // Content should not be rendered when collapsed
      expect(screen.queryByText('📅 Appointments')).not.toBeInTheDocument();
      expect(screen.queryByText('Recent & Upcoming')).not.toBeInTheDocument();
    });

    test('shows content when mobile and open', async () => {
      const user = userEvent.setup();
      mockInnerWidth(600);
      render(<Sidebar {...mockProps} />);
      
      const hamburgerButton = screen.getByText('☰');
      await user.click(hamburgerButton);
      
      expect(screen.getByText('📅 Appointments')).toBeInTheDocument();
      expect(screen.getByText('Recent & Upcoming')).toBeInTheDocument();
    });

    test('hides content when mobile and closed', () => {
      mockInnerWidth(600);
      render(<Sidebar {...mockProps} />);
      
      // Content should not be rendered when mobile is closed
      expect(screen.queryByText('📅 Appointments')).not.toBeInTheDocument();
      expect(screen.queryByText('Recent & Upcoming')).not.toBeInTheDocument();
    });
  });
});
