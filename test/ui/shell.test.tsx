import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageShell } from '../../dashboard/react/app/PageShell';
import { SURFACES } from '../../dashboard/react/app/surfaces';

describe('PageShell', () => {
  it('renders the scoped surface root with the surface name and its children', () => {
    const { container } = render(
      <PageShell surface="dashboard">
        <p>surface content</p>
      </PageShell>,
    );

    const root = container.querySelector('.crucix-surface');
    expect(root).not.toBeNull();
    expect(root).toHaveClass('crucix-surface');
    expect(root).toHaveAttribute('data-surface', 'dashboard');
    // The wrapper is the single root element and passes children through.
    expect(container.firstElementChild).toBe(root);
    expect(screen.getByText('surface content')).toBeInTheDocument();
  });

  it('tags every surface', () => {
    for (const surface of SURFACES) {
      const { unmount } = render(<PageShell surface={surface} />);
      expect(
        document.querySelector(`.crucix-surface[data-surface="${surface}"]`),
      ).not.toBeNull();
      unmount();
    }
  });

  it('imports the shared tokens stylesheet without throwing', async () => {
    const tokens = await import('../../dashboard/react/styles/tokens.css');
    expect(tokens).toBeDefined();
  });
});
