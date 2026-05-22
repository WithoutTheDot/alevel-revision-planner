// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TodaySection from '../TodaySection';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('../SubjectBadge', () => ({
  default: ({ subject }) => <span data-testid="subject-badge">{subject}</span>,
}));

vi.mock('../../lib/pmtLinks', () => ({
  getPmtLinks: (subject, paperPath) => ({
    qp: `https://pmt/${subject}/${paperPath}-qp.pdf`,
    ms: `https://pmt/${subject}/${paperPath}-ms.pdf`,
  }),
}));

function renderTodaySection(props = {}) {
  return render(
    <MemoryRouter>
      <TodaySection
        todaysPapers={[]}
        onComplete={() => {}}
        onStartTimer={() => {}}
        dayName="Monday"
        {...props}
      />
    </MemoryRouter>
  );
}

describe('TodaySection', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('shows empty-state message when no papers today', () => {
    renderTodaySection();
    expect(screen.getByText(/No papers scheduled/i)).toBeInTheDocument();
  });

  it('renders papers with start + log buttons when not completed', () => {
    const onStartTimer = vi.fn();
    const onComplete = vi.fn();
    renderTodaySection({
      todaysPapers: [
        { paper: { subject: 'maths', displayName: 'Pure 1', paperPath: 'p1', completed: false }, index: 4 },
      ],
      onStartTimer, onComplete,
      weekId: '2024-04-01',
    });
    fireEvent.click(screen.getByRole('button', { name: /Start/ }));
    expect(onStartTimer).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'Pure 1' }),
      4
    );
    fireEvent.click(screen.getByRole('button', { name: /Log/ }));
    expect(onComplete).toHaveBeenCalledWith(4);
  });

  it('shows "Done" badge and Edit button when completed', () => {
    renderTodaySection({
      todaysPapers: [
        { paper: { subject: 'maths', displayName: 'Pure 1', paperPath: 'p1', completed: true }, index: 0 },
      ],
      weekId: '2024-04-01',
    });
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
  });

  it('enriches paper passed to PmtLinkButton with weekId and _idx (regression: viewer completion)', () => {
    renderTodaySection({
      todaysPapers: [
        { paper: { subject: 'maths', displayName: 'Pure 1', paperPath: 'p1', completed: false }, index: 5 },
      ],
      weekId: '2024-04-01',
    });
    // Click the "Q" PMT link button → triggers navigate('/view-paper', { state })
    fireEvent.click(screen.getByRole('button', { name: /^Q$/ }));
    expect(navigateMock).toHaveBeenCalledTimes(1);
    const state = navigateMock.mock.calls[0][1].state;
    expect(state.paper.weekId).toBe('2024-04-01');
    expect(state.paper._idx).toBe(5);
    expect(state.paper.displayName).toBe('Pure 1');
    expect(state.msUrl).toBe('https://pmt/maths/p1-ms.pdf');
  });

  it('passes weekId/_idx for MS link too', () => {
    renderTodaySection({
      todaysPapers: [
        { paper: { subject: 'maths', displayName: 'Pure 1', paperPath: 'p1', completed: false }, index: 2 },
      ],
      weekId: 'w-id',
    });
    fireEvent.click(screen.getByRole('button', { name: /^MS$/ }));
    const state = navigateMock.mock.calls[0][1].state;
    expect(state.paper.weekId).toBe('w-id');
    expect(state.paper._idx).toBe(2);
  });
});
