import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SearchBar from './SearchBar';

// Mock the Search icon from lucide-react
jest.mock('lucide-react', () => ({
  Search: ({ size }) => <div data-testid="search-icon" data-size={size}>Search Icon</div>,
}));

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

describe('SearchBar Component', () => {
  const mockOnResults = jest.fn();
  const mockToken = 'mock-jwt-token';

  const defaultProps = {
    onResults: mockOnResults,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(mockToken);
    fetch.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders search bar with correct structure', () => {
    render(<SearchBar {...defaultProps} />);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  test('renders search input with correct placeholder', () => {
    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  test('renders search button with search icon', () => {
    render(<SearchBar {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /search/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('title', 'Search');
    
    const searchIcon = screen.getByTestId('search-icon');
    expect(searchIcon).toBeInTheDocument();
    expect(searchIcon).toHaveAttribute('data-size', '18');
  });

  test('updates input value when typing', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    
    await user.type(input, 'meeting');
    expect(input.value).toBe('meeting');
  });

  test('prevents search when keyword is empty', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);
    
    const button = screen.getByRole('button', { name: /search/i });
    await user.click(button);
    
    expect(fetch).not.toHaveBeenCalled();
    expect(mockOnResults).not.toHaveBeenCalled();
  });

  test('prevents search when keyword is only whitespace', async () => {
    const user = userEvent.setup();
    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    const button = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, '   ');
    await user.click(button);
    
    expect(fetch).not.toHaveBeenCalled();
    expect(mockOnResults).not.toHaveBeenCalled();
  });

  test('makes API call with correct parameters on search', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue([
        { id: 1, title: 'Meeting with client' },
        { id: 2, title: 'Team meeting' },
      ]),
    };
    fetch.mockResolvedValue(mockResponse);

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    const button = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'meeting');
    await user.click(button);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/appointments/user/search?keyword=meeting',
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockToken}`,
          },
        }
      );
    });
  });

  test('encodes special characters in search keyword', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    };
    fetch.mockResolvedValue(mockResponse);

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    const button = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'meeting & review');
    await user.click(button);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/appointments/user/search?keyword=meeting%20%26%20review',
        expect.any(Object)
      );
    });
  });

 test('calls onResults with search results on successful search', async () => {
  const user = userEvent.setup();
  const mockResults = [
    { id: 1, title: 'Meeting with client' },
    { id: 2, title: 'Team meeting' },
  ];
  const mockResponse = {
    ok: true,
    json: jest.fn().mockResolvedValue(mockResults),
  };
  fetch.mockResolvedValue(mockResponse);

  render(<SearchBar {...defaultProps} />);
  
  const input = screen.getByPlaceholderText('Search appointments...');
  const button = screen.getByRole('button', { name: /search/i });
  
  await user.type(input, 'meeting');
  await user.click(button);
  
  await waitFor(() => {
    // Your SearchBar calls onResults(data, true) - so expect both parameters
    expect(mockOnResults).toHaveBeenCalledWith(mockResults, true);
  });
});

  test('shows loading state during search', async () => {
    const user = userEvent.setup();
    let resolvePromise;
    const mockPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    
    fetch.mockReturnValue(mockPromise);

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    const button = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'meeting');
    await user.click(button);
    
    // Check loading state
    expect(button).toBeDisabled();
    expect(screen.getByText('…')).toBeInTheDocument();
    expect(screen.queryByTestId('search-icon')).not.toBeInTheDocument();
    
    // Resolve the promise
    resolvePromise({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
    
    await waitFor(() => {
      expect(screen.queryByText('…')).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  test('handles search error gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockRejectedValue(new Error('Network error'));

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    const button = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'meeting');
    await user.click(button);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
    
    await waitFor(() => {
      expect(mockOnResults).toHaveBeenCalledWith([]);
    });

    consoleSpy.mockRestore();
  });

  test('handles non-ok response gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockResponse = {
      ok: false,
      status: 404,
    };
    fetch.mockResolvedValue(mockResponse);

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    const button = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'meeting');
    await user.click(button);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
    
    await waitFor(() => {
      expect(mockOnResults).toHaveBeenCalledWith([]);
    });

    consoleSpy.mockRestore();
  });

  test('retrieves JWT token from localStorage', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    };
    fetch.mockResolvedValue(mockResponse);

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    const button = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'meeting');
    await user.click(button);
    
    await waitFor(() => {
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('jwtToken');
    });
  });

  test('handles missing JWT token', async () => {
    const user = userEvent.setup();
    mockLocalStorage.getItem.mockReturnValue(null);
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    };
    fetch.mockResolvedValue(mockResponse);

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    const button = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'meeting');
    await user.click(button);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer null',
          }),
        })
      );
    });
  });

  test('can trigger search by pressing Enter in input', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    };
    fetch.mockResolvedValue(mockResponse);

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    
    await user.type(input, 'meeting');
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  test('maintains input value after search', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    };
    fetch.mockResolvedValue(mockResponse);

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    const button = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'meeting');
    await user.click(button);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    
    expect(input.value).toBe('meeting');
  });

 test('handles empty search results', async () => {
  const user = userEvent.setup();
  const mockResponse = {
    ok: true,
    json: jest.fn().mockResolvedValue([]),
  };
  fetch.mockResolvedValue(mockResponse);
  
  render(<SearchBar {...defaultProps} />);
  
  const input = screen.getByPlaceholderText('Search appointments...');
  const button = screen.getByRole('button', { name: /search/i });
  
  await user.type(input, 'nonexistent');
  await user.click(button);
  
  await waitFor(() => {
    // Even with empty results, successful response calls onResults(data, true)
    expect(mockOnResults).toHaveBeenCalledWith([], true);
  });
});

  test('applies correct CSS classes', () => {
    const { container } = render(<SearchBar {...defaultProps} />);
    
    expect(container.querySelector('.search-bar')).toBeInTheDocument();
    expect(container.querySelector('.search-btn')).toBeInTheDocument();
  });

  test('button is disabled only during loading', async () => {
    const user = userEvent.setup();
    let resolvePromise;
    const controlledPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    fetch.mockReturnValue(controlledPromise);

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    const button = screen.getByRole('button', { name: /search/i });
    
    // Initially not disabled
    expect(button).not.toBeDisabled();
    
    await user.type(input, 'meeting');
    await user.click(button);
    
    // Should be disabled during loading
    expect(button).toBeDisabled();
    
    // Resolve the promise
    resolvePromise({
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    });
    
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  test('handles JSON parsing error', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockResponse = {
      ok: true,
      json: jest.fn().mockRejectedValue(new Error('JSON parsing failed')),
    };
    fetch.mockResolvedValue(mockResponse);

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    const button = screen.getByRole('button', { name: /search/i });
    
    await user.type(input, 'meeting');
    await user.click(button);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
    
    await waitFor(() => {
      expect(mockOnResults).toHaveBeenCalledWith([]);
    });

    consoleSpy.mockRestore();
  });

  test('form submission prevents default behavior', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue([]),
    };
    fetch.mockResolvedValue(mockResponse);

    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('Search appointments...');
    
    await user.type(input, 'meeting');
    
    // Simulate form submission
    const form = input.closest('form');
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    const preventDefaultSpy = jest.spyOn(submitEvent, 'preventDefault');
    
    form.dispatchEvent(submitEvent);
    
    expect(preventDefaultSpy).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});
