import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsyncData } from '../useAsyncData';

describe('useAsyncData', () => {
  it('starts in loading state', () => {
    const loader = vi.fn(() => new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useAsyncData(loader, []));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('');
  });

  it('sets data on successful load', async () => {
    const loader = vi.fn().mockResolvedValue([1, 2, 3]);
    const { result } = renderHook(() => useAsyncData(loader, []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([1, 2, 3]);
    expect(result.current.error).toBe('');
  });

  it('sets error on failure', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAsyncData(loader, []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('reload re-runs the loader', async () => {
    let callCount = 0;
    const loader = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(`call-${callCount}`);
    });
    const { result } = renderHook(() => useAsyncData(loader, []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('call-1');

    await act(async () => { result.current.reload(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('call-2');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('clears error on successful reload', async () => {
    let fail = true;
    const loader = vi.fn().mockImplementation(() =>
      fail ? Promise.reject(new Error('fail')) : Promise.resolve('ok')
    );
    const { result } = renderHook(() => useAsyncData(loader, []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('fail');

    fail = false;
    await act(async () => { result.current.reload(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('');
    expect(result.current.data).toBe('ok');
  });
});
