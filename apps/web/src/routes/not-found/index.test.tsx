import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from './index';

describe('NotFoundPage', () => {
  it('renders the missing page state with a dashboard link', () => {
    render(<NotFoundPage />);

    expect(screen.getByRole('heading', { name: "This page doesn't exist" })).toBeInTheDocument();
    expect(
      screen.getByText('The link may be outdated, or the page may have been moved.'),
    ).toBeInTheDocument();

    const dashboardLink = screen.getByRole('link', { name: 'Go to dashboard' });
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });
});
