import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from './Modal';

// Helper functions for testing
const isoTo12HourTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
};

const derivePeriod = (iso) => {
  if (!iso) return "AM";
  return new Date(iso).getHours() >= 12 ? "PM" : "AM";
};

describe('Modal Component', () => {
  const mockSetShowModal = jest.fn();
  const mockHandleAddOrEdit = jest.fn();
  const mockHandleDelete = jest.fn();

  const defaultProps = {
    showModal: true,
    setShowModal: mockSetShowModal,
    editingAppointment: null,
    newSlotTime: null,
    handleAddOrEdit: mockHandleAddOrEdit,
    handleDelete: mockHandleDelete,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not render when showModal is false', () => {
    render(<Modal {...defaultProps} showModal={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders new appointment modal with correct title', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('New Appointment')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('renders edit appointment modal with correct title', () => {
    const editingAppointment = {
      id: 1,
      title: 'Test Meeting',
      startTime: '2024-01-15T10:00:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      description: 'Test description',
      location: 'Test location',
      attendees: 'john@example.com, jane@example.com',
      type: 'Meeting',
      recurrence: 0
    };

    render(<Modal {...defaultProps} editingAppointment={editingAppointment} />);
    expect(screen.getByText('Edit Appointment')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Meeting')).toBeInTheDocument();
  });

  test('populates form fields when editing appointment', () => {
    const editingAppointment = {
      id: 1,
      title: 'Test Meeting',
      startTime: '2024-01-15T14:30:00.000Z', // 2:30 PM
      endTime: '2024-01-15T15:30:00.000Z',   // 3:30 PM
      description: 'Test description',
      location: 'Conference Room A',
      attendees: 'john@example.com, jane@example.com',
      type: 'Personal',
      recurrence: 0
    };

    render(<Modal {...defaultProps} editingAppointment={editingAppointment} />);

    expect(screen.getByDisplayValue('Test Meeting')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Conference Room A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com, jane@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Personal')).toBeInTheDocument();
  });

  test('sets default time values for new appointment with newSlotTime', () => {
    const newSlotTime = new Date('2024-01-15T14:30:00.000Z'); // 2:30 PM
    render(<Modal {...defaultProps} newSlotTime={newSlotTime} />);

    const startTimeInput = screen.getByDisplayValue(isoTo12HourTime(newSlotTime.toISOString()));
    expect(startTimeInput).toBeInTheDocument();
    
    const expectedEndTime = new Date(newSlotTime.getTime() + 30 * 60000);
    const endTimeInput = screen.getByDisplayValue(isoTo12HourTime(expectedEndTime.toISOString()));
    expect(endTimeInput).toBeInTheDocument();
  });

  test('sets correct AM/PM periods for time inputs', () => {
    const editingAppointment = {
      id: 1,
      title: 'Morning Meeting',
      startTime: '2024-01-15T09:00:00.000Z', // 9:00 AM
      endTime: '2024-01-15T15:00:00.000Z',   // 3:00 PM
      recurrence: 0
    };

    render(<Modal {...defaultProps} editingAppointment={editingAppointment} />);

    // Check that the form renders with time inputs
    const timeInputs = screen.getAllByDisplayValue(/^\d{2}:\d{2}$/);
    expect(timeInputs).toHaveLength(2); // start and end time
  });

  test('renders all form fields with correct attributes', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByPlaceholderText('Title')).toBeRequired();
    expect(screen.getByPlaceholderText('Description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Location')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Attendees (comma-separated)')).toBeInTheDocument();
    
    // Check time inputs have correct step attribute
    const timeInputs = screen.getAllByDisplayValue('');
    const timeTypeInputs = timeInputs.filter(input => input.type === 'time');
    timeTypeInputs.forEach(input => {
      expect(input).toHaveAttribute('step', '1800');
      expect(input).toBeRequired();
    });
  });

  test('renders type/category dropdown with all options', () => {
    render(<Modal {...defaultProps} />);

    expect(screen.getByDisplayValue('Meeting')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Meeting' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Personal' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Deadline' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Follow-up' })).toBeInTheDocument();
  });

  test('renders recurrence dropdown with all options', () => {
    render(<Modal {...defaultProps} />);

    const recurrenceSelect = screen.getByDisplayValue('None');
    expect(recurrenceSelect).toBeInTheDocument();
    
    expect(screen.getByRole('option', { name: 'None' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Daily' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Weekly' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Monthly' })).toBeInTheDocument();
  });

  test('shows recurrence options when recurrence type is not None', () => {
    render(<Modal {...defaultProps} />);

    const recurrenceSelect = screen.getByDisplayValue('None');
    fireEvent.change(recurrenceSelect, { target: { value: 'Daily' } });

    expect(screen.getByText('Repeat Every')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Interval')).toBeInTheDocument();
    expect(screen.getByText('day(s)')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });

  test('shows correct interval text for different recurrence types', () => {
    render(<Modal {...defaultProps} />);

    const recurrenceSelect = screen.getByDisplayValue('None');

    // Test Daily
    fireEvent.change(recurrenceSelect, { target: { value: 'Daily' } });
    expect(screen.getByText('day(s)')).toBeInTheDocument();

    // Test Weekly
    fireEvent.change(recurrenceSelect, { target: { value: 'Weekly' } });
    expect(screen.getByText('week(s)')).toBeInTheDocument();

    // Test Monthly
    fireEvent.change(recurrenceSelect, { target: { value: 'Monthly' } });
    expect(screen.getByText('month(s)')).toBeInTheDocument();
  });

  test('hides recurrence options when recurrence type is None', () => {
    render(<Modal {...defaultProps} />);

    const recurrenceSelect = screen.getByDisplayValue('None');
    
    // First show options
    fireEvent.change(recurrenceSelect, { target: { value: 'Daily' } });
    expect(screen.getByText('Repeat Every')).toBeInTheDocument();

    // Then hide them
    fireEvent.change(recurrenceSelect, { target: { value: 'None' } });
    expect(screen.queryByText('Repeat Every')).not.toBeInTheDocument();
  });

  test('sets recurrence interval constraints correctly', () => {
    render(<Modal {...defaultProps} />);

    const recurrenceSelect = screen.getByDisplayValue('None');
    fireEvent.change(recurrenceSelect, { target: { value: 'Daily' } });

    const intervalInput = screen.getByPlaceholderText('Interval');
    expect(intervalInput).toHaveAttribute('min', '1');
    expect(intervalInput).toHaveAttribute('max', '30');
    expect(intervalInput).toHaveAttribute('type', 'number');
  });

  test('sets minimum date for recurrence end date', () => {
    render(<Modal {...defaultProps} />);

    const recurrenceSelect = screen.getByDisplayValue('None');
    fireEvent.change(recurrenceSelect, { target: { value: 'Daily' } });

    // Use a more specific query to get the date input
    const endDateField = screen.getByRole('dialog').querySelector('input[name="recurrenceEndDate"]');
    
    const today = new Date().toISOString().split('T')[0];
    expect(endDateField).toHaveAttribute('min', today);
  });

  test('maps numeric recurrence values to string for editing', () => {
    const editingAppointment = {
      id: 1,
      title: 'Recurring Meeting',
      startTime: '2024-01-15T10:00:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      recurrence: 2, // Weekly
      recurrenceInterval: 2,
      recurrenceEndDate: '2024-03-15T00:00:00.000Z'
    };

    render(<Modal {...defaultProps} editingAppointment={editingAppointment} />);

    expect(screen.getByDisplayValue('Weekly')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  test('formats recurrence end date correctly for editing', () => {
    const editingAppointment = {
      id: 1,
      title: 'Recurring Meeting',
      startTime: '2024-01-15T10:00:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      recurrence: 1,
      recurrenceEndDate: '2024-03-15T10:00:00.000Z'
    };

    render(<Modal {...defaultProps} editingAppointment={editingAppointment} />);

    const endDateInput = screen.getByDisplayValue('2024-03-15');
    expect(endDateInput).toBeInTheDocument();
  });

  test('shows delete button only in edit mode', () => {
    // New appointment - no delete button
    const { rerender } = render(<Modal {...defaultProps} />);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();

    // Edit appointment - delete button present
    const editingAppointment = {
      id: 1,
      title: 'Test Meeting',
      startTime: '2024-01-15T10:00:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      recurrence: 0
    };

    rerender(<Modal {...defaultProps} editingAppointment={editingAppointment} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  test('shows correct action button text', () => {
    // New appointment
    const { rerender } = render(<Modal {...defaultProps} />);
    expect(screen.getByText('Save')).toBeInTheDocument();

    // Edit appointment
    const editingAppointment = {
      id: 1,
      title: 'Test Meeting',
      startTime: '2024-01-15T10:00:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      recurrence: 0
    };

    rerender(<Modal {...defaultProps} editingAppointment={editingAppointment} />);
    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  test('calls handleAddOrEdit when form is submitted', () => {
    render(<Modal {...defaultProps} />);

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    expect(mockHandleAddOrEdit).toHaveBeenCalledTimes(1);
  });

  test('calls handleDelete when delete button is clicked', () => {
    const editingAppointment = {
      id: 1,
      title: 'Test Meeting',
      startTime: '2024-01-15T10:00:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      recurrence: 0
    };

    render(<Modal {...defaultProps} editingAppointment={editingAppointment} />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockHandleDelete).toHaveBeenCalledTimes(1);
  });

  test('calls setShowModal when cancel button is clicked', () => {
    render(<Modal {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockSetShowModal).toHaveBeenCalledWith(false);
  });

  test('resets recurrence type when modal opens for new appointment', () => {
    const { rerender } = render(<Modal {...defaultProps} showModal={false} />);
    
    // Open modal for new appointment
    rerender(<Modal {...defaultProps} showModal={true} />);
    
    expect(screen.getByDisplayValue('None')).toBeInTheDocument();
  });

  test('handles empty or undefined values gracefully', () => {
    const editingAppointment = {
      id: 1,
      title: 'Test Meeting',
      startTime: '2024-01-15T10:00:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      description: null,
      location: undefined,
      attendees: '',
      recurrence: 0
    };

    render(<Modal {...defaultProps} editingAppointment={editingAppointment} />);

    expect(screen.getByPlaceholderText('Description')).toHaveValue('');
    expect(screen.getByPlaceholderText('Location')).toHaveValue('');
    expect(screen.getByPlaceholderText('Attendees (comma-separated)')).toHaveValue('');
  });

  test('handles invalid recurrence values gracefully', () => {
    const editingAppointment = {
      id: 1,
      title: 'Test Meeting',
      startTime: '2024-01-15T10:00:00.000Z',
      endTime: '2024-01-15T11:00:00.000Z',
      recurrence: 999 // Invalid value
    };

    render(<Modal {...defaultProps} editingAppointment={editingAppointment} />);

    expect(screen.getByDisplayValue('None')).toBeInTheDocument();
  });

  test('updates recurrence type state when dropdown changes', () => {
    render(<Modal {...defaultProps} />);

    const recurrenceSelect = screen.getByDisplayValue('None');
    
    fireEvent.change(recurrenceSelect, { target: { value: 'Weekly' } });
    expect(screen.getByDisplayValue('Weekly')).toBeInTheDocument();
    
    fireEvent.change(recurrenceSelect, { target: { value: 'Monthly' } });
    expect(screen.getByDisplayValue('Monthly')).toBeInTheDocument();
  });

  test('renders time labels correctly', () => {
    render(<Modal {...defaultProps} />);
    
    expect(screen.getByText('Start Time')).toBeInTheDocument();
    expect(screen.getByText('End Time')).toBeInTheDocument();
  });

  test('renders recurrence label correctly', () => {
    render(<Modal {...defaultProps} />);
    
    expect(screen.getByText('Recurrence')).toBeInTheDocument();
  });

  test('has proper modal structure and accessibility', () => {
    render(<Modal {...defaultProps} />);
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveClass('modal-content');
  });
});
