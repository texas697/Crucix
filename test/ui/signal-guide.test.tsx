import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from '../../dashboard/react/theme';
import { useState, type ReactElement } from 'react';
import { CLASSES } from '../../dashboard/react/features/dashboard/classes';
import { SignalGuide, signalGuideItems } from '../../dashboard/react/features/dashboard/components/SignalGuide';

afterEach(cleanup);

const theme = createAppTheme('dark');

function renderThemed(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('SignalGuide', () => {
  it('renders nothing when closed', () => {
    renderThemed(<SignalGuide isOpen={false} onClose={() => {}} />);
    expect(document.querySelector('#glossaryOverlay')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders each item with its term and every labelled body line', () => {
    renderThemed(<SignalGuide isOpen onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Signal Guide')).toBeInTheDocument();
    expect(screen.getByText('What the signals actually mean')).toBeInTheDocument();
    expect(document.querySelectorAll(`.${CLASSES.guideCard}`)).toHaveLength(signalGuideItems.length);

    for (const item of signalGuideItems) {
      expect(screen.getByText(item.term)).toBeInTheDocument();
      expect(screen.getByText(item.meaning)).toBeInTheDocument();
      expect(screen.getByText(item.matters)).toBeInTheDocument();
      expect(screen.getByText(item.notMeaning)).toBeInTheDocument();
      expect(screen.getByText(item.example)).toBeInTheDocument();
    }
    // The four section labels repeat on every card.
    expect(screen.getAllByText('Meaning')).toHaveLength(signalGuideItems.length);
    expect(screen.getAllByText('Why it matters')).toHaveLength(signalGuideItems.length);
    expect(screen.getAllByText('Not proof of')).toHaveLength(signalGuideItems.length);
    expect(screen.getAllByText('Example')).toHaveLength(signalGuideItems.length);
  });

  it('moves focus into the dialog when opened', () => {
    renderThemed(<SignalGuide isOpen onClose={() => {}} />);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderThemed(<SignalGuide isOpen onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the close button and the backdrop, but not a click inside the panel', () => {
    const onClose = vi.fn();
    renderThemed(<SignalGuide isOpen onClose={onClose} />);

    fireEvent.mouseDown(screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    // The MUI Dialog closes on a mousedown+click pair that both land on its container (the backdrop area).
    const backdropArea = document.querySelector('#glossaryOverlay .MuiDialog-container')!;
    fireEvent.mouseDown(backdropArea);
    fireEvent.click(backdropArea);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Close signal guide' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('locks body scroll while open and restores it on close', () => {
    const { unmount } = renderThemed(<SignalGuide isOpen onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('restores focus to the trigger when it closes', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open signal guide</button>
          <SignalGuide isOpen={open} onClose={() => setOpen(false)} />
        </>
      );
    }

    renderThemed(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open signal guide' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
