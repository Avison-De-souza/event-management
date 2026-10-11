import { render, screen } from '@testing-library/react';
import App from './App';

// Avoid hitting the real database during tests.
jest.mock('./supabaseClient', () => ({ supabase: {} }));

test('shows the sign-in screen when logged out', () => {
  sessionStorage.clear();
  render(<App />);
  expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
});
