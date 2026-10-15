import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../../dashboard/react/app/App';
import { SURFACES, SURFACE_TITLES } from '../../dashboard/react/app/surfaces';

describe('App placeholder', () => {
  it('renders every surface with its title', () => {
    for (const surface of SURFACES) {
      const { unmount } = render(<App surface={surface} />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(SURFACE_TITLES[surface]);
      unmount();
    }
  });

  it('tags the surface for tests and selection debugging', () => {
    render(<App surface="digest" />);
    expect(document.querySelector('main')).toHaveAttribute('data-surface', 'digest');
  });
});
