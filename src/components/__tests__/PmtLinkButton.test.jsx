// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PmtLinkButton from '../PmtLinkButton';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('PmtLinkButton', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('renders plain anchor when no paper given', () => {
    renderWithRouter(<PmtLinkButton href="https://x/qp.pdf" label="QP" />);
    const a = screen.getByRole('link', { name: /QP/ });
    expect(a).toHaveAttribute('href', 'https://x/qp.pdf');
    expect(a).toHaveAttribute('target', '_blank');
  });

  it('navigates to /view-paper with paper + msUrl when paper given', () => {
    const paper = { subject: 'maths', paperPath: '2023/p1', weekId: '2024-04-01', _idx: 3 };
    renderWithRouter(
      <PmtLinkButton href="https://x/qp.pdf" label="Q" paper={paper} msHref="https://x/ms.pdf" />
    );
    fireEvent.click(screen.getByRole('button', { name: /Q/ }));
    expect(navigateMock).toHaveBeenCalledWith('/view-paper', {
      state: {
        pdfUrl: 'https://x/qp.pdf',
        label: 'Q',
        paper,
        msUrl: 'https://x/ms.pdf',
      },
    });
  });

  it('forwards weekId and _idx through paper prop (regression: viewer completion sync)', () => {
    const paper = { subject: 'maths', paperPath: '2023/p1', weekId: '2024-04-01', _idx: 7 };
    renderWithRouter(<PmtLinkButton href="https://x/qp.pdf" label="Q" paper={paper} />);
    fireEvent.click(screen.getByRole('button'));
    const state = navigateMock.mock.calls[0][1].state;
    expect(state.paper.weekId).toBe('2024-04-01');
    expect(state.paper._idx).toBe(7);
    expect(state.msUrl).toBeNull();
  });
});
