import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Test">Content</Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders children and title when open', () => {
    render(<Modal open onClose={vi.fn()} title="My Dialog">Hello World</Modal>);
    expect(screen.getByText('My Dialog')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('has role=dialog and aria-modal attributes', () => {
    render(<Modal open onClose={vi.fn()} title="Test">x</Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('aria-labelledby points to the title element', () => {
    render(<Modal open onClose={vi.fn()} title="Accessible Title">x</Modal>);
    const dialog = screen.getByRole('dialog');
    const labelledById = dialog.getAttribute('aria-labelledby');
    const titleEl = document.getElementById(labelledById);
    expect(titleEl?.textContent).toBe('Accessible Title');
  });

  it('calls onClose when ESC is pressed', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="T">x</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal open onClose={onClose} title="T">x</Modal>);
    // The backdrop is the first absolute div inside the fixed container
    const backdrop = container.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('close button has aria-label', () => {
    render(<Modal open onClose={vi.fn()} title="T">x</Modal>);
    expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument();
  });
});
