import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ErrorBoundary from '../components/ErrorBoundary';

const ErrorComponent = () => {
  throw new Error('Test error');
};

const SafeComponent = () => <div>Safe content</div>;

describe('ErrorBoundary', () => {
  test('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  test('should render fallback UI when error occurs', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  test('should allow retry after error', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create a component that can throw or not based on state
    let shouldThrow = true;
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Safe content</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Disable throwing and click retry
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    // Should now show safe content
    expect(screen.getByText('Safe content')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  test('should use custom fallback when provided', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Custom error message</div>}>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});