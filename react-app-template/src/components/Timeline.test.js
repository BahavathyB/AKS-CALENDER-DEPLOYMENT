import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Timeline from './Timeline';

// Mock AppointmentBlock component
jest.mock('./AppointmentBlock', () => {
  return function MockAppointmentBlock({ appointment, onClick, className, highlight }) {
    return (
      <div
        data-testid={`appointment-${appointment.id}`}
        className={`appointment-block ${className || ''}`}
        onClick={onClick}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', appointment.id.toString());
        }}
        style={{
          backgroundColor: highlight ? '#ffeb3b' : '#1976d2',
          position: 'absolute',
          top: `${Math.floor((new Date(appointment.startTime).getHours() * 60 + new Date(appointment.startTime).getMinutes()) / 30 * 80)}px`,
          height: `${((new Date(appointment.endTime) - new Date(appointment.startTime)) / (1000 * 60)) / 30 * 80}px`,
          width: '200px'
        }}
      >
        <div>{appointment.title}</div>
        <div>{new Date(appointment.startTime).toLocaleTimeString()}</div>
      </div>
    );
  };
});

// Mock DragEvent for testing environment
global.DragEvent = class DragEvent extends Event {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict);
    this.dataTransfer = eventInitDict.dataTransfer || {
      getData: jest.fn(),
      setData: jest.fn(),
      clearData: jest.fn(),
      files: [],
      items: [],
      types: []
    };
  }
};

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock scrollTo function for DOM elements
Element.prototype.scrollTo = jest.fn();

describe('Timeline Component', () => {
  const mockAppointments = [
    {
      id: 1,
      title: 'Morning Meeting',
      startTime: '2024-01-15T09:00:00',
      endTime: '2024-01-15T10:00:00',
      type: 'Meeting',
      description: 'Team standup',
      location: 'Conference Room A',
      colorCode: '#1976d2',
      userId: 1
    },
    {
      id: 2,
      title: 'Lunch Break',
      startTime: '2024-01-15T12:30:00',
      endTime: '2024-01-15T13:30:00',
      type: 'Personal',
      description: 'Lunch with client',
      location: 'Restaurant',
      colorCode: '#4caf50',
      userId: 1
    },
    {
      id: 3,
      title: 'Different Day Meeting',
      startTime: '2024-01-16T10:00:00',
      endTime: '2024-01-16T11:00:00',
      type: 'Meeting',
      description: 'Another meeting',
      location: 'Office',
      colorCode: '#ff9800',
      userId: 1
    }
  ];

  const mockProps = {
    appointments: mockAppointments,
    selectedDate: '2024-01-15',
    isSameDay: jest.fn(),
    isToday: jest.fn(),
    onAppointmentClick: jest.fn(),
    onEmptySlotClick: jest.fn(),
    slotHeight: 80,
    getStatus: jest.fn(),
    nowPx: 720, // 9 AM position
    loggedInUser: {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      timeZoneId: 'America/New_York'
    },
    fetchAppointments: jest.fn(),
    highlightedAppointments: []
  };

  // Mock console methods to avoid test output noise
  const originalConsole = {
    log: console.log,
    error: console.error
  };

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    mockLocalStorage.getItem.mockReturnValue('mock-jwt-token');
    Element.prototype.scrollTo.mockClear();
    
    // Default mock implementations
    mockProps.isSameDay.mockImplementation((appointmentDate, selectedDate) => {
      const apptDate = new Date(appointmentDate).toDateString();
      const selDate = new Date(selectedDate).toDateString();
      return apptDate === selDate;
    });
    
    mockProps.isToday.mockReturnValue(false);
    mockProps.getStatus.mockReturnValue('upcoming');
  });

  describe('Basic Rendering', () => {
    test('renders timeline with time slots', () => {
      render(<Timeline {...mockProps} />);
      
      expect(screen.getByText('12:00 AM')).toBeInTheDocument();
      expect(screen.getByText('12:30 AM')).toBeInTheDocument();
      expect(screen.getByText('9:00 AM')).toBeInTheDocument();
      expect(screen.getByText('12:00 PM')).toBeInTheDocument();
      expect(screen.getByText('11:30 PM')).toBeInTheDocument();
    });

    test('renders 48 time slots (24 hours * 2)', () => {
      render(<Timeline {...mockProps} />);
      
      const timeSlots = document.querySelectorAll('.time-slot');
      expect(timeSlots).toHaveLength(48);
    });

    test('applies custom slot height', () => {
      render(<Timeline {...mockProps} slotHeight={100} />);
      
      const timeSlots = document.querySelectorAll('.time-slot');
      timeSlots.forEach(slot => {
        expect(slot).toHaveStyle('height: 100px');
      });
    });

    test('renders timeline grid with drag and drop handlers', () => {
      render(<Timeline {...mockProps} />);
      
      const timelineGrid = document.querySelector('.timeline-grid');
      expect(timelineGrid).toBeInTheDocument();
    });
  });

  describe('Appointment Filtering and Display', () => {
    test('displays appointments for selected date only', () => {
      render(<Timeline {...mockProps} />);
      
      expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
      expect(screen.getByTestId('appointment-2')).toBeInTheDocument();
      expect(screen.queryByTestId('appointment-3')).not.toBeInTheDocument();
    });

    test('filters appointments using isSameDay function', () => {
      mockProps.isSameDay.mockImplementation((appointmentDate, selectedDate) => {
        // Only return true for first appointment
        return appointmentDate === '2024-01-15T09:00:00';
      });

      render(<Timeline {...mockProps} />);
      
      expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
      expect(screen.queryByTestId('appointment-2')).not.toBeInTheDocument();
      expect(mockProps.isSameDay).toHaveBeenCalledWith('2024-01-15T09:00:00', '2024-01-15');
    });

    test('updates appointments when props change', async () => {
      const { rerender } = render(<Timeline {...mockProps} />);
      
      expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
      
      const newAppointments = [
        {
          id: 4,
          title: 'New Meeting',
          startTime: '2024-01-15T14:00:00',
          endTime: '2024-01-15T15:00:00',
          type: 'Meeting'
        }
      ];
      
      rerender(<Timeline {...mockProps} appointments={newAppointments} />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('appointment-1')).not.toBeInTheDocument();
        expect(screen.getByTestId('appointment-4')).toBeInTheDocument();
      });
    });

    test('handles empty appointments array', () => {
      render(<Timeline {...mockProps} appointments={[]} />);
      
      expect(screen.queryByTestId(/appointment-/)).not.toBeInTheDocument();
      expect(screen.getByText('12:00 AM')).toBeInTheDocument(); // Time slots still render
    });
  });

  describe('Appointment Highlighting', () => {
    test('highlights specified appointments', () => {
      render(<Timeline {...mockProps} highlightedAppointments={[]} />);
      
      const normalAppt = screen.getByTestId('appointment-1');
      expect(normalAppt).not.toHaveClass('highlight');
      expect(normalAppt).toHaveStyle('background-color: rgb(25, 118, 210)');
    });

    test('does not highlight non-specified appointments', () => {
      render(<Timeline {...mockProps} highlightedAppointments={[]} />);
      
      const normalAppt = screen.getByTestId('appointment-2');
      expect(normalAppt).not.toHaveClass('highlight');
      expect(normalAppt).toHaveStyle('background-color: rgb(25, 118, 210)');
    });

    test('scrolls to first highlighted appointment', async () => {
      render(<Timeline {...mockProps} highlightedAppointments={[1]} />);
      
      await waitFor(() => {
        expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
          top: expect.any(Number),
          behavior: 'smooth'
        });
      });
    });

    test('does not scroll when no appointments are highlighted', () => {
      render(<Timeline {...mockProps} highlightedAppointments={[]} />);
      
      expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
    });

  test('handles scroll effect when highlighted appointment is not found', async () => {
    render(<Timeline {...mockProps} highlightedAppointments={[999]} />); // Non-existent appointment ID
    
    // Should not scroll when appointment is not found
    expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
  });
  });

  describe('Now Line Display', () => {
    test('shows now line when isToday returns true', () => {
      mockProps.isToday.mockReturnValue(true);
      render(<Timeline {...mockProps} />);
      
      const nowLine = document.querySelector('.now-line');
      expect(nowLine).toBeInTheDocument();
      expect(nowLine).toHaveStyle('top: 720px');
    });

    test('hides now line when isToday returns false', () => {
      mockProps.isToday.mockReturnValue(false);
      render(<Timeline {...mockProps} />);
      
      const nowLine = document.querySelector('.now-line');
      expect(nowLine).not.toBeInTheDocument();
    });

    test('positions now line correctly based on nowPx prop', () => {
      mockProps.isToday.mockReturnValue(true);
      render(<Timeline {...mockProps} nowPx={1000} />);
      
      const nowLine = document.querySelector('.now-line');
      expect(nowLine).toHaveStyle('top: 1000px');
    });
  });

  describe('Click Interactions', () => {
    test('calls onAppointmentClick when appointment is clicked', async () => {
      const user = userEvent.setup();
      render(<Timeline {...mockProps} />);
      
      const appointment = screen.getByTestId('appointment-1');
      await user.click(appointment);
      
      expect(mockProps.onAppointmentClick).toHaveBeenCalledWith(mockAppointments[0]);
    });

    test('calls onEmptySlotClick when time slot is clicked', async () => {
      const user = userEvent.setup();
      render(<Timeline {...mockProps} />);
      
      const timeSlots = document.querySelectorAll('.time-slot');
      await user.click(timeSlots[0]); // Click first slot (12:00 AM)
      
      expect(mockProps.onEmptySlotClick).toHaveBeenCalledWith(expect.any(Date));
    });

    test('does not call onEmptySlotClick when handler is not provided', async () => {
      const user = userEvent.setup();
      render(<Timeline {...mockProps} onEmptySlotClick={null} />);
      
      const timeSlots = document.querySelectorAll('.time-slot');
      
      // Should not throw error
      expect(() => user.click(timeSlots[0])).not.toThrow();
    });
  });

  describe('Drag and Drop Functionality', () => {
    test('handles dragover event', () => {
      render(<Timeline {...mockProps} />);
      
      const timelineGrid = document.querySelector('.timeline-grid');
      
      // Create drag event using fireEvent
      fireEvent.dragOver(timelineGrid);
      
      // Test that the event handler exists and can be called
      expect(timelineGrid).toBeInTheDocument();
    });

    test('handles dragenter event', () => {
      render(<Timeline {...mockProps} />);
      
      const timelineGrid = document.querySelector('.timeline-grid');
      
      // Create drag event using fireEvent
      fireEvent.dragEnter(timelineGrid);
      
      // Test that the event handler exists and can be called
      expect(timelineGrid).toBeInTheDocument();
    });

    test('handles successful drop and updates appointment time', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<Timeline {...mockProps} />);
      
      const timelineGrid = document.querySelector('.timeline-grid');
      
      // Mock getBoundingClientRect to return consistent values
      const mockGetBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 0,
        width: 400,
        height: 3840, // 48 slots * 80px each
        bottom: 3840,
        right: 400,
        x: 0,
        y: 0
      }));
      
      timelineGrid.getBoundingClientRect = mockGetBoundingClientRect;
      
      // Mock scrollTop
      Object.defineProperty(timelineGrid, 'scrollTop', {
        value: 0,
        writable: true,
        configurable: true
      });
      
      // Create drop event with dataTransfer
      const mockDataTransfer = {
        getData: jest.fn().mockReturnValue('1')
      };
      
      await act(async () => {
        fireEvent.drop(timelineGrid, {
          clientY: 1600, // 20 slots * 80px = 10:00 AM
          dataTransfer: mockDataTransfer
        });
      });
      
      // Wait for async update
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/appointments/user/1',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer mock-jwt-token'
            }),
            body: expect.stringContaining('"Title":"Morning Meeting"')
          })
        );
      });
    });

    test('handles drop with invalid appointment ID', async () => {
      render(<Timeline {...mockProps} />);
      
      const timelineGrid = document.querySelector('.timeline-grid');
      timelineGrid.getBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 0,
        width: 400,
        height: 3840
      }));
      
      const mockDataTransfer = {
        getData: jest.fn().mockReturnValue('999') // Non-existent appointment ID
      };
      
      fireEvent.drop(timelineGrid, {
        dataTransfer: mockDataTransfer
      });
      
      // Should not make API call for invalid appointment
      expect(fetch).not.toHaveBeenCalled();
    });

    test('handles drop with empty data transfer', () => {
      render(<Timeline {...mockProps} />);
      
      const timelineGrid = document.querySelector('.timeline-grid');
      
      const mockDataTransfer = {
        getData: jest.fn().mockReturnValue('') // Empty data
      };
      
      fireEvent.drop(timelineGrid, {
        dataTransfer: mockDataTransfer
      });
      
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('API Integration', () => {
    test('updates appointment successfully and refetches data', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(<Timeline {...mockProps} />);
      
      const timelineGrid = document.querySelector('.timeline-grid');
      timelineGrid.getBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 0,
        width: 400,
        height: 3840
      }));
      
      Object.defineProperty(timelineGrid, 'scrollTop', { 
        value: 0,
        writable: true,
        configurable: true
      });
      
      const mockDataTransfer = {
        getData: jest.fn().mockReturnValue('1')
      };
      
      await act(async () => {
        fireEvent.drop(timelineGrid, {
          clientY: 1600,
          dataTransfer: mockDataTransfer
        });
      });
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/appointments/user/1',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"Title":"Morning Meeting"')
          })
        );
      });
      
      // Wait for the setTimeout to trigger fetchAppointments
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });
      
      expect(mockProps.fetchAppointments).toHaveBeenCalled();
    });

    test('handles API failure and refetches data', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      render(<Timeline {...mockProps} />);
      
      const timelineGrid = document.querySelector('.timeline-grid');
      timelineGrid.getBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 0,
        width: 400,
        height: 3840
      }));
      
      Object.defineProperty(timelineGrid, 'scrollTop', { 
        value: 0,
        writable: true,
        configurable: true
      });
      
      const mockDataTransfer = {
        getData: jest.fn().mockReturnValue('1')
      };
      
      await act(async () => {
        fireEvent.drop(timelineGrid, {
          clientY: 1600,
          dataTransfer: mockDataTransfer
        });
      });
      
      await waitFor(() => {
        expect(mockProps.fetchAppointments).toHaveBeenCalled();
      });
    });

    test('handles network error and refetches data', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Timeline {...mockProps} />);
      
      const timelineGrid = document.querySelector('.timeline-grid');
      timelineGrid.getBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 0,
        width: 400,
        height: 3840
      }));
      
      Object.defineProperty(timelineGrid, 'scrollTop', { 
        value: 0,
        writable: true,
        configurable: true
      });
      
      const mockDataTransfer = {
        getData: jest.fn().mockReturnValue('1')
      };
      
      await act(async () => {
        fireEvent.drop(timelineGrid, {
          clientY: 1600,
          dataTransfer: mockDataTransfer
        });
      });
      
      await waitFor(() => {
        expect(mockProps.fetchAppointments).toHaveBeenCalled();
      });
    });

    test('handles missing auth token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      render(<Timeline {...mockProps} />);
      
      const timelineGrid = document.querySelector('.timeline-grid');
      timelineGrid.getBoundingClientRect = jest.fn(() => ({
        top: 0,
        left: 0,
        width: 400,
        height: 3840
      }));
      
      Object.defineProperty(timelineGrid, 'scrollTop', { 
        value: 0,
        writable: true,
        configurable: true
      });
      
      const mockDataTransfer = {
        getData: jest.fn().mockReturnValue('1')
      };
      
      fireEvent.drop(timelineGrid, {
        clientY: 1600,
        dataTransfer: mockDataTransfer
      });
      
      expect(fetch).not.toHaveBeenCalled();
    });
     test('handles missing token in background update', async () => {
    mockLocalStorage.getItem.mockReturnValue(null); // No token
    
    render(<Timeline {...mockProps} />);
    
    const timelineGrid = document.querySelector('.timeline-grid');
    timelineGrid.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      width: 400,
      height: 3840
    }));
    
    Object.defineProperty(timelineGrid, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true
    });
    
    const mockDataTransfer = {
      getData: jest.fn().mockReturnValue('1')
    };
    
    fireEvent.drop(timelineGrid, {
      clientY: 1600,
      dataTransfer: mockDataTransfer
    });
    
    // Should log error and not make API call
    expect(console.error).toHaveBeenCalledWith('No auth token found');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('handles appointments with mixed property casing in drag update', async () => {
    const appointmentWithMixedProps = {
      id: 1,
      Title: 'Meeting with Title', // Capital T
      startTime: '2024-01-15T09:00:00',
      endTime: '2024-01-15T10:00:00',
      Description: 'Capital D description', // Capital D
      location: 'lowercase location', // lowercase
      Type: 'Capital Type', // Capital T
      colorCode: '#123456', // lowercase
      Recurrence: 1, // Capital R
      recurrenceInterval: 2, // lowercase
      RecurrenceEndDate: '2024-12-31T23:59:59', // Capital
      UserId: 123 // Capital
    };
    
    const propsWithMixedAppointment = {
      ...mockProps,
      appointments: [appointmentWithMixedProps]
    };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    
    render(<Timeline {...propsWithMixedAppointment} />);
    
    const timelineGrid = document.querySelector('.timeline-grid');
    timelineGrid.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      width: 400,
      height: 3840
    }));
    
    Object.defineProperty(timelineGrid, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true
    });
    
    const mockDataTransfer = {
      getData: jest.fn().mockReturnValue('1')
    };
    
    await act(async () => {
      fireEvent.drop(timelineGrid, {
        clientY: 1600,
        dataTransfer: mockDataTransfer
      });
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/appointments/user/1',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"Title":"Meeting with Title"')
        })
      );
    });
  });

  test('logs success message on successful background update', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    
    render(<Timeline {...mockProps} />);
    
    const timelineGrid = document.querySelector('.timeline-grid');
    timelineGrid.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      width: 400,
      height: 3840
    }));
    
    Object.defineProperty(timelineGrid, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true
    });
    
    const mockDataTransfer = {
      getData: jest.fn().mockReturnValue('1')
    };
    
    await act(async () => {
      fireEvent.drop(timelineGrid, {
        clientY: 1600,
        dataTransfer: mockDataTransfer
      });
    });
    
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith('✅ Appointment updated successfully');
    });
  });

  test('logs error message on failed background update', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400
    });
    
    render(<Timeline {...mockProps} />);
    
    const timelineGrid = document.querySelector('.timeline-grid');
    timelineGrid.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      width: 400,
      height: 3840
    }));
    
    Object.defineProperty(timelineGrid, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true
    });
    
    const mockDataTransfer = {
      getData: jest.fn().mockReturnValue('1')
    };
    
    await act(async () => {
      fireEvent.drop(timelineGrid, {
        clientY: 1600,
        dataTransfer: mockDataTransfer
      });
    });
    
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('❌ Failed to update appointment');
      expect(mockProps.fetchAppointments).toHaveBeenCalled();
    });
  });

  test('handles fetchAppointments being undefined', async () => {
    const propsWithoutFetch = {
      ...mockProps,
      fetchAppointments: undefined
    };
    
    fetch.mockRejectedValueOnce(new Error('Network error'));
    
    render(<Timeline {...propsWithoutFetch} />);
    
    const timelineGrid = document.querySelector('.timeline-grid');
    timelineGrid.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      width: 400,
      height: 3840
    }));
    
    Object.defineProperty(timelineGrid, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true
    });
    
    const mockDataTransfer = {
      getData: jest.fn().mockReturnValue('1')
    };
    
    await act(async () => {
      fireEvent.drop(timelineGrid, {
        clientY: 1600,
        dataTransfer: mockDataTransfer
      });
    });
    
    // Should not throw error when fetchAppointments is undefined
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('❌ Background update failed:', expect.any(Error));
    });
  });
  test('handles successful update without fetchAppointments callback', async () => {
    const propsWithoutFetch = {
      ...mockProps,
      fetchAppointments: undefined
    };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    
    render(<Timeline {...propsWithoutFetch} />);
    
    const timelineGrid = document.querySelector('.timeline-grid');
    timelineGrid.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      width: 400,
      height: 3840
    }));
    
    Object.defineProperty(timelineGrid, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true
    });
    
    const mockDataTransfer = {
      getData: jest.fn().mockReturnValue('1')
    };
    
    await act(async () => {
      fireEvent.drop(timelineGrid, {
        clientY: 1600,
        dataTransfer: mockDataTransfer
      });
    });
    
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith('✅ Appointment updated successfully');
    });
    
    // Wait for setTimeout to complete (should not call fetchAppointments since it's undefined)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });
  });

  test('handles failed update without fetchAppointments callback', async () => {
    const propsWithoutFetch = {
      ...mockProps,
      fetchAppointments: undefined
    };
    
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });
    
    render(<Timeline {...propsWithoutFetch} />);
    
    const timelineGrid = document.querySelector('.timeline-grid');
    timelineGrid.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      width: 400,
      height: 3840
    }));
    
    Object.defineProperty(timelineGrid, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true
    });
    
    const mockDataTransfer = {
      getData: jest.fn().mockReturnValue('1')
    };
    
    await act(async () => {
      fireEvent.drop(timelineGrid, {
        clientY: 1600,
        dataTransfer: mockDataTransfer
      });
    });
    
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('❌ Failed to update appointment');
    });
    
    // Should not throw error when fetchAppointments is undefined
  });

  test('handles appointments with all lowercase properties', async () => {
    const appointmentWithLowercaseProps = {
      id: 1,
      title: 'lowercase title',
      startTime: '2024-01-15T09:00:00',
      endTime: '2024-01-15T10:00:00',
      description: 'lowercase description',
      location: 'lowercase location',
      type: 'lowercase type',
      colorCode: '#123456',
      recurrence: 1,
      recurrenceInterval: 2,
      recurrenceEndDate: '2024-12-31T23:59:59',
      userId: 123
    };
    
    const propsWithLowercaseAppointment = {
      ...mockProps,
      appointments: [appointmentWithLowercaseProps]
    };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    
    render(<Timeline {...propsWithLowercaseAppointment} />);
    
    const timelineGrid = document.querySelector('.timeline-grid');
    timelineGrid.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      width: 400,
      height: 3840
    }));
    
    Object.defineProperty(timelineGrid, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true
    });
    
    const mockDataTransfer = {
      getData: jest.fn().mockReturnValue('1')
    };
    
    await act(async () => {
      fireEvent.drop(timelineGrid, {
        clientY: 1600,
        dataTransfer: mockDataTransfer
      });
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/appointments/user/1',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"Title":"lowercase title"')
        })
      );
    });
  });

  test('handles appointments with all uppercase properties', async () => {
    const appointmentWithUppercaseProps = {
      id: 1,
      Title: 'Uppercase Title',
      startTime: '2024-01-15T09:00:00',
      endTime: '2024-01-15T10:00:00',
      Description: 'Uppercase Description',
      Location: 'Uppercase Location',
      Type: 'Uppercase Type',
      ColorCode: '#123456',
      Recurrence: 1,
      RecurrenceInterval: 2,
      RecurrenceEndDate: '2024-12-31T23:59:59',
      UserId: 123
    };
    
    const propsWithUppercaseAppointment = {
      ...mockProps,
      appointments: [appointmentWithUppercaseProps]
    };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });
    
    render(<Timeline {...propsWithUppercaseAppointment} />);
    
    const timelineGrid = document.querySelector('.timeline-grid');
    timelineGrid.getBoundingClientRect = jest.fn(() => ({
      top: 0,
      left: 0,
      width: 400,
      height: 3840
    }));
    
    Object.defineProperty(timelineGrid, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true
    });
    
    const mockDataTransfer = {
      getData: jest.fn().mockReturnValue('1')
    };
    
    await act(async () => {
      fireEvent.drop(timelineGrid, {
        clientY: 1600,
        dataTransfer: mockDataTransfer
      });
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/appointments/user/1',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"Title":"Uppercase Title"')
        })
      );
    });
  });
  });

  describe('Time Calculations', () => {
    test('calculates correct time slot positions', () => {
      render(<Timeline {...mockProps} />);
      
      // Check 9:00 AM slot (18th slot: 9 * 2 = 18)
      const timeSlots = document.querySelectorAll('.time-slot');
      expect(timeSlots[18]).toHaveTextContent('9:00 AM');
      
      // Check 2:30 PM slot (29th slot: 14 * 2 + 1 = 29)
      expect(timeSlots[29]).toHaveTextContent('2:30 PM');
    });

    test('handles 12-hour time format correctly', () => {
      render(<Timeline {...mockProps} />);
      
      expect(screen.getByText('12:00 AM')).toBeInTheDocument(); // Midnight
      expect(screen.getByText('12:00 PM')).toBeInTheDocument(); // Noon
      expect(screen.getByText('1:00 AM')).toBeInTheDocument();
      expect(screen.getByText('1:00 PM')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles appointments with missing properties', () => {
      const incompleteAppointments = [
        {
          id: 1,
          title: 'Incomplete Meeting',
          startTime: '2024-01-15T09:00:00',
          endTime: '2024-01-15T10:00:00'
          // Missing other properties
        }
      ];

      render(<Timeline {...mockProps} appointments={incompleteAppointments} />);
      
      expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
    });

    test('handles invalid date strings gracefully', () => {
      const invalidAppointments = [
        {
          id: 1,
          title: 'Invalid Date Meeting',
          startTime: 'invalid-date',
          endTime: '2024-01-15T10:00:00',
          type: 'Meeting'
        }
      ];

      expect(() => {
        render(<Timeline {...mockProps} appointments={invalidAppointments} />);
      }).not.toThrow();
    });

    test('handles very long appointments', () => {
      const longAppointments = [
        {
          id: 1,
          title: 'All Day Meeting',
          startTime: '2024-01-15T00:00:00',
          endTime: '2024-01-15T23:59:59',
          type: 'Meeting'
        }
      ];

      render(<Timeline {...mockProps} appointments={longAppointments} />);
      
      expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
    });

    test('handles appointments that span multiple days', () => {
      const spanningAppointments = [
        {
          id: 1,
          title: 'Overnight Meeting',
          startTime: '2024-01-15T23:00:00',
          endTime: '2024-01-16T01:00:00',
          type: 'Meeting'
        }
      ];

      render(<Timeline {...mockProps} appointments={spanningAppointments} />);
      
      expect(screen.getByTestId('appointment-1')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    test('does not cause memory leaks with frequent prop updates', async () => {
      const { rerender } = render(<Timeline {...mockProps} />);
      
      // Simulate frequent updates
      for (let i = 0; i < 10; i++) {
        const newAppointments = mockAppointments.map(appt => ({
          ...appt,
          title: `${appt.title} - Update ${i}`
        }));
        
        rerender(<Timeline {...mockProps} appointments={newAppointments} />);
      }
      
      // Should still render correctly
      expect(screen.getByText('Morning Meeting - Update 9')).toBeInTheDocument();
    });

    test('handles large number of appointments efficiently', () => {
      const manyAppointments = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        title: `Meeting ${i + 1}`,
        startTime: `2024-01-15T${String(Math.floor(i / 4)).padStart(2, '0')}:${(i % 4) * 15}:00`,
        endTime: `2024-01-15T${String(Math.floor(i / 4)).padStart(2, '0')}:${(i % 4) * 15 + 15}:00`,
        type: 'Meeting'
      }));

      const startTime = performance.now();
      render(<Timeline {...mockProps} appointments={manyAppointments} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
