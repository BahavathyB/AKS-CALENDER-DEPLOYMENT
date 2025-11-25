import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from './Login';

// Mock fetch globally
global.fetch = jest.fn();

// Mock Intl API
const mockTimeZones = [
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Tokyo',
  'UTC'
];

// Store original Intl
const originalIntl = global.Intl;

beforeAll(() => {
  // Mock DateTimeFormat constructor
  const MockDateTimeFormat = function() {
    return {
      resolvedOptions: () => ({
        timeZone: 'America/New_York'
      })
    };
  };

  // Mock supportedValuesOf
  const mockSupportedValuesOf = (type) => {
    if (type === 'timeZone') {
      return mockTimeZones;
    }
    return [];
  };

  // Replace global Intl
  global.Intl = {
    ...originalIntl,
    DateTimeFormat: MockDateTimeFormat,
    supportedValuesOf: mockSupportedValuesOf
  };
});

afterAll(() => {
  global.Intl = originalIntl;
});

beforeEach(() => {
  fetch.mockClear();
  localStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
  window.alert.mockRestore();
});

describe('Login Component', () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    mockOnLogin.mockClear();
  });

  test('renders login form by default', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    expect(screen.getByText('Appointments')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  test('switches to register form when register button is clicked', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    
    expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last Name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();
  });

  test('switches back to login form from register form', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(screen.queryByPlaceholderText('First Name')).not.toBeInTheDocument();
  });

  test('renders timezone dropdown with options in register mode', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    
    const timezoneSelect = screen.getByDisplayValue('America/New_York');
    expect(timezoneSelect).toBeInTheDocument();
    
    mockTimeZones.forEach(timezone => {
      expect(screen.getByRole('option', { name: timezone })).toBeInTheDocument();
    });
  });

  test('updates input values when typing', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });
    
    expect(usernameInput.value).toBe('testuser');
    expect(passwordInput.value).toBe('testpass');
  });

  test('successful login calls onLogin with user data and token', async () => {
    const mockUserData = {
      user: {
        id: 1,
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        timeZoneId: 'America/New_York'
      },
      token: 'fake-jwt-token'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserData
    });

    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'testpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'testpass' })
      });
    });

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith({
        id: 1,
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        timeZoneId: 'America/New_York'
      }, 'fake-jwt-token');
    });
  });

  test('successful registration shows success message', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Registration successful' })
    });

    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'newpass' } });
    fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Smith' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'newuser',
          password: 'newpass',
          firstName: 'Jane',
          lastName: 'Smith',
          timeZoneId: 'America/New_York'
        })
      });
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Registration successful! You can now login.');
    });
  });

  test('displays error message on login failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' })
    });

    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'baduser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'badpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  test('displays error message on registration failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Username already exists' })
    });

    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'existinguser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } });
    fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'John' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    
    await waitFor(() => {
      expect(screen.getByText('Username already exists')).toBeInTheDocument();
    });
  });

  test('handles network errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'testpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Try again.')).toBeInTheDocument();
    });

    expect(console.error).toHaveBeenCalled();
  });

  test('required fields are marked as required', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    expect(screen.getByPlaceholderText('Username')).toBeRequired();
    expect(screen.getByPlaceholderText('Password')).toBeRequired();
    
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    
    expect(screen.getByPlaceholderText('First Name')).toBeRequired();
    expect(screen.getByPlaceholderText('Last Name')).not.toBeRequired();
  });

  test('displays generic error message when response has no message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({})
    });

    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'testpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  test('updates register form inputs when typing', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    
    const firstNameInput = screen.getByPlaceholderText('First Name');
    const lastNameInput = screen.getByPlaceholderText('Last Name');
    const timezoneSelect = screen.getByDisplayValue('America/New_York');
    
    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    fireEvent.change(timezoneSelect, { target: { value: 'Europe/London' } });
    
    expect(firstNameInput.value).toBe('John');
    expect(lastNameInput.value).toBe('Doe');
    expect(timezoneSelect.value).toBe('Europe/London');
  });
});
