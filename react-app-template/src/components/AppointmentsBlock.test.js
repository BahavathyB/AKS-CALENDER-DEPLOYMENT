import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppointmentBlock from './AppointmentBlock';

// Mock DragEvent for testing environment
global.DragEvent = class DragEvent extends Event {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict);
    this.dataTransfer = eventInitDict.dataTransfer || {
      getData: jest.fn(),
      setData: jest.fn(),
      clearData: jest.fn(),
      effectAllowed: '',
      files: [],
      items: [],
      types: []
    };
  }
};

describe('AppointmentBlock Component', () => {
  const mockAppointment = {
    id: 1,
    title: 'Morning Meeting',
    startTime: '2024-01-15T09:00:00',
    endTime: '2024-01-15T10:00:00',
    type: 'Meeting',
    description: 'Team standup',
    location: 'Conference Room A',
    colorCode: '#1976d2',
    userId: 1
  };

  const defaultProps = {
    appointment: mockAppointment,
    onClick: jest.fn(),
    slotHeight: 80,
    getStatus: null, // Use local status calculation
    highlight: false,
    className: ''
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current time to a fixed date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T08:00:00')); // Before the appointment
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    test('renders appointment title', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      expect(screen.getByText('Morning Meeting')).toBeInTheDocument();
    });

    test('renders appointment time range', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      // Get the appointment block and check its text content directly
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock.textContent).toMatch(/09:00 am.*10:00 am/);
    });

    test('applies correct positioning and height', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      
      // 9:00 AM = 540 minutes from midnight
      // (540 / 30) * 80 = 1440px top position
      expect(appointmentBlock).toHaveStyle('top: 1440px');
      
      // 1 hour duration = 60 minutes
      // (60 / 30) * 80 = 160px height
      expect(appointmentBlock).toHaveStyle('height: 160px');
    });

    test('applies custom slot height', () => {
      render(<AppointmentBlock {...defaultProps} slotHeight={100} />);
      
      const appointmentBlock = screen.getByRole('button');
      
      // With slotHeight 100: (540 / 30) * 100 = 1800px
      expect(appointmentBlock).toHaveStyle('top: 1800px');
      // Height: (60 / 30) * 100 = 200px
      expect(appointmentBlock).toHaveStyle('height: 200px');
    });

    test('applies minimum height of 24px', () => {
      const shortAppointment = {
        ...mockAppointment,
        startTime: '2024-01-15T09:00:00',
        endTime: '2024-01-15T09:05:00' // 5 minutes
      };

      render(<AppointmentBlock {...defaultProps} appointment={shortAppointment} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveStyle('height: 24px');
    });

    test('applies default background color when no color specified', () => {
      const appointmentWithoutColor = {
        ...mockAppointment,
        colorCode: undefined,
        ColorCode: undefined
      };

      render(<AppointmentBlock {...defaultProps} appointment={appointmentWithoutColor} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveStyle('background-color: #1976d2');
    });

    test('applies colorCode property', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveStyle('background-color: #1976d2');
    });

    test('applies ColorCode property (capital C)', () => {
      const appointmentWithCapitalColor = {
        ...mockAppointment,
        ColorCode: '#ff5722',
        colorCode: undefined
      };

      render(<AppointmentBlock {...defaultProps} appointment={appointmentWithCapitalColor} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveStyle('background-color: #ff5722');
    });

    test('prioritizes ColorCode over colorCode', () => {
      const appointmentWithBothColors = {
        ...mockAppointment,
        ColorCode: '#ff5722',
        colorCode: '#4caf50'
      };

      render(<AppointmentBlock {...defaultProps} appointment={appointmentWithBothColors} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveStyle('background-color: #ff5722');
    });
  });

  describe('Status Handling', () => {
    test('uses provided getStatus function', () => {
      const mockGetStatus = jest.fn().mockReturnValue('custom-status');
      
      render(<AppointmentBlock {...defaultProps} getStatus={mockGetStatus} />);
      
      expect(mockGetStatus).toHaveBeenCalledWith('2024-01-15T09:00:00', '2024-01-15T10:00:00');
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveClass('custom-status');
    });

    test('uses local status calculation when getStatus not provided', () => {
      render(<AppointmentBlock {...defaultProps} getStatus={null} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveClass('upcoming'); // Current time is 8:00 AM, appointment is 9:00 AM
    });

    test('calculates "upcoming" status correctly', () => {
      jest.setSystemTime(new Date('2024-01-15T08:00:00')); // Before appointment
      
      render(<AppointmentBlock {...defaultProps} getStatus={null} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveClass('upcoming');
    });

    test('calculates "ongoing" status correctly', () => {
      jest.setSystemTime(new Date('2024-01-15T09:30:00')); // During appointment
      
      render(<AppointmentBlock {...defaultProps} getStatus={null} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveClass('ongoing');
    });

    test('calculates "completed" status correctly', () => {
      jest.setSystemTime(new Date('2024-01-15T11:00:00')); // After appointment
      
      render(<AppointmentBlock {...defaultProps} getStatus={null} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveClass('completed');
    });
  });

  describe('Highlighting', () => {
    test('applies highlight class when highlight is true', () => {
      render(<AppointmentBlock {...defaultProps} highlight={true} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveClass('highlight');
    });

    test('does not apply highlight class when highlight is false', () => {
      render(<AppointmentBlock {...defaultProps} highlight={false} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).not.toHaveClass('highlight');
    });

    test('applies custom className', () => {
      render(<AppointmentBlock {...defaultProps} className="custom-class" />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveClass('custom-class');
    });

    test('combines all classes correctly', () => {
      render(<AppointmentBlock {...defaultProps} highlight={true} className="custom-class" />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveClass('appointment-block');
      expect(appointmentBlock).toHaveClass('upcoming');
      expect(appointmentBlock).toHaveClass('highlight');
      expect(appointmentBlock).toHaveClass('custom-class');
    });
  });

  describe('Click Interactions', () => {
    test('calls onClick when clicked', () => {
      const mockOnClick = jest.fn();
      
      render(<AppointmentBlock {...defaultProps} onClick={mockOnClick} />);
      
      const appointmentBlock = screen.getByRole('button');
      fireEvent.click(appointmentBlock);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('calls onClick when Enter key is pressed', () => {
      const mockOnClick = jest.fn();
      
      render(<AppointmentBlock {...defaultProps} onClick={mockOnClick} />);
      
      const appointmentBlock = screen.getByRole('button');
      fireEvent.keyDown(appointmentBlock, { key: 'Enter' });
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test('does not call onClick when other keys are pressed', () => {
      const mockOnClick = jest.fn();
      
      render(<AppointmentBlock {...defaultProps} onClick={mockOnClick} />);
      
      const appointmentBlock = screen.getByRole('button');
      fireEvent.keyDown(appointmentBlock, { key: 'Space' });
      fireEvent.keyDown(appointmentBlock, { key: 'Escape' });
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    test('does not throw error when onClick is not provided', () => {
      render(<AppointmentBlock {...defaultProps} onClick={null} />);
      
      const appointmentBlock = screen.getByRole('button');
      
      expect(() => {
        fireEvent.click(appointmentBlock);
      }).not.toThrow();
    });

    test('does not call onClick when event is defaultPrevented', () => {
      const mockOnClick = jest.fn();
      
      render(<AppointmentBlock {...defaultProps} onClick={mockOnClick} />);
      
      const appointmentBlock = screen.getByRole('button');
      
      // Create a custom event with defaultPrevented set to true
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'defaultPrevented', { value: true });
      
      fireEvent(appointmentBlock, event);
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Drag and Drop Functionality', () => {
    test('is draggable', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveAttribute('draggable', 'true');
    });

    test('sets correct data on drag start', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      const mockDataTransfer = {
        setData: jest.fn(),
        effectAllowed: ''
      };
      
      fireEvent.dragStart(appointmentBlock, {
        dataTransfer: mockDataTransfer
      });
      
      expect(mockDataTransfer.setData).toHaveBeenCalledWith('text/plain', '1');
      expect(mockDataTransfer.effectAllowed).toBe('move');
    });

    test('applies visual feedback on drag start', async () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      const mockDataTransfer = {
        setData: jest.fn(),
        effectAllowed: ''
      };
      
      fireEvent.dragStart(appointmentBlock, {
        dataTransfer: mockDataTransfer
      });
      
      // Wait for setTimeout to execute
      await waitFor(() => {
        expect(appointmentBlock).toHaveStyle('opacity: 0.5');
      });
    });

    test('resets visual feedback on drag end', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      
      // First set opacity to 0.5 (simulating drag start)
      appointmentBlock.style.opacity = '0.5';
      
      fireEvent.dragEnd(appointmentBlock);
      
      expect(appointmentBlock).toHaveStyle('opacity: 1');
    });

    test('has correct cursor style for dragging', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveStyle('cursor: move');
    });

    test('prevents text selection during drag', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveStyle('user-select: none');
    });
  });

  describe('Time Display', () => {
    test('displays time in 12-hour format', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock.textContent).toMatch(/09:00 am.*10:00 am/);
    });

    test('handles PM times correctly', () => {
      const pmAppointment = {
        ...mockAppointment,
        startTime: '2024-01-15T14:30:00',
        endTime: '2024-01-15T15:45:00'
      };

      render(<AppointmentBlock {...defaultProps} appointment={pmAppointment} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock.textContent).toMatch(/02:30 pm.*03:45 pm/);
    });

    test('handles midnight times correctly', () => {
      const midnightAppointment = {
        ...mockAppointment,
        startTime: '2024-01-15T00:00:00',
        endTime: '2024-01-15T00:30:00'
      };

      render(<AppointmentBlock {...defaultProps} appointment={midnightAppointment} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock.textContent).toMatch(/12:00 am.*12:30 am/);
    });

    test('handles noon times correctly', () => {
      const noonAppointment = {
        ...mockAppointment,
        startTime: '2024-01-15T12:00:00',
        endTime: '2024-01-15T12:30:00'
      };

      render(<AppointmentBlock {...defaultProps} appointment={noonAppointment} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock.textContent).toMatch(/12:00 pm.*12:30 pm/);
    });
  });

  describe('Accessibility', () => {
    test('has correct ARIA role', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toBeInTheDocument();
    });

    test('is focusable', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toHaveAttribute('tabIndex', '0');
    });

    test('can be focused', () => {
      render(<AppointmentBlock {...defaultProps} />);
      
      const appointmentBlock = screen.getByRole('button');
      appointmentBlock.focus();
      
      expect(appointmentBlock).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    test('handles invalid start time gracefully', () => {
      const invalidAppointment = {
        ...mockAppointment,
        startTime: 'invalid-date',
        endTime: '2024-01-15T10:00:00'
      };

      expect(() => {
        render(<AppointmentBlock {...defaultProps} appointment={invalidAppointment} />);
      }).not.toThrow();
    });

    test('handles invalid end time gracefully', () => {
      const invalidAppointment = {
        ...mockAppointment,
        startTime: '2024-01-15T09:00:00',
        endTime: 'invalid-date'
      };

      expect(() => {
        render(<AppointmentBlock {...defaultProps} appointment={invalidAppointment} />);
      }).not.toThrow();
    });

    test('handles missing appointment title', () => {
      const appointmentWithoutTitle = {
        ...mockAppointment,
        title: undefined
      };

      render(<AppointmentBlock {...defaultProps} appointment={appointmentWithoutTitle} />);
      
      // Should still render the component structure
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toBeInTheDocument();
    });

    test('handles appointments spanning multiple days', () => {
      const spanningAppointment = {
        ...mockAppointment,
        startTime: '2024-01-15T23:30:00',
        endTime: '2024-01-16T01:30:00'
      };

      render(<AppointmentBlock {...defaultProps} appointment={spanningAppointment} />);
      
      const appointmentBlock = screen.getByRole('button');
      expect(appointmentBlock).toBeInTheDocument();
    });

    test('handles very long appointments', () => {
      const longAppointment = {
        ...mockAppointment,
        startTime: '2024-01-15T09:00:00',
        endTime: '2024-01-15T18:00:00' // 9 hours
      };

      render(<AppointmentBlock {...defaultProps} appointment={longAppointment} />);
      
      const appointmentBlock = screen.getByRole('button');
      // 9 hours = 540 minutes, (540 / 30) * 80 = 1440px height
      expect(appointmentBlock).toHaveStyle('height: 1440px');
    });

    test('handles appointments with end time before start time', () => {
      const invalidTimeAppointment = {
        ...mockAppointment,
        startTime: '2024-01-15T10:00:00',
        endTime: '2024-01-15T09:00:00' // End before start
      };

      render(<AppointmentBlock {...defaultProps} appointment={invalidTimeAppointment} />);
      
      const appointmentBlock = screen.getByRole('button');
      // Should still apply minimum height
      expect(appointmentBlock).toHaveStyle('height: 24px');
    });
  });

  describe('Performance', () => {
    test('renders quickly with complex appointment data', () => {
      const complexAppointment = {
        ...mockAppointment,
        title: 'Very Long Appointment Title That Contains Many Words And Should Still Render Quickly',
        description: 'A very detailed description with lots of information that might affect rendering performance',
        location: 'Conference Room A, Building B, Floor 3, Suite 400, Downtown Office Complex'
      };

      const startTime = performance.now();
      render(<AppointmentBlock {...defaultProps} appointment={complexAppointment} />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should render in less than 50ms
    });

    test('handles frequent prop updates efficiently', () => {
      const { rerender } = render(<AppointmentBlock {...defaultProps} />);
      
      const startTime = performance.now();
      
      // Simulate frequent updates
      for (let i = 0; i < 100; i++) {
        const updatedAppointment = {
          ...mockAppointment,
          title: `Updated Title ${i}`
        };
        rerender(<AppointmentBlock {...defaultProps} appointment={updatedAppointment} />);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(200); // Should handle 100 updates in less than 200ms
    });
  });
});
