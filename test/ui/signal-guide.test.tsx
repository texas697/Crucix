import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { SignalGuide, signalGuideItems } from '../../dashboard/react/features/dashboard/SignalGuide';

afterEach(cleanup);

describe('SignalGuide', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<SignalGuide open={false} onClose={() => {}} />);
    expect(container.querySelector('#glossaryOverlay')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders each item with its term and every labelled body line', () => {
    render(<SignalGuide open onClose={() => {}} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Signal Guide')).toBeInTheDocument();
    expect(screen.getByText('What the signals actually mean')).toBeInTheDocument();
    expect(document.querySelectorAll('.glossary-card')).toHaveLength(signalGuideItems.length);

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
    render(<SignalGuide open onClose={() => {}} />);
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<SignalGuide open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the close button and the backdrop, but not a click inside the panel', () => {
    const onClose = vi.fn();
    const { container } = render(<SignalGuide open onClose={onClose} />);

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector('#glossaryOverlay')!);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Close signal guide' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('locks body scroll while open and restores it on close', () => {
    const { unmount } = render(<SignalGuide open onClose={() => {}} />);
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
          <SignalGuide open={open} onClose={() => setOpen(false)} />
        </>
      );
    }

    render(<Harness />);
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
