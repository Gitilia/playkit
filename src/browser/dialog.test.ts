import { describe, expect, it, vi } from 'vitest';
import { withDialog } from './dialog.js';

describe('withDialog', () => {
  it('runs fn directly when the dialog is already open', async () => {
    const isOpen = vi.fn(async () => true);
    const reopen = vi.fn(async () => undefined);
    const fn = vi.fn(async () => 'ok');

    const result = await withDialog({ isOpen, reopen }, fn);

    expect(result).toBe('ok');
    expect(reopen).not.toHaveBeenCalled();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('reopens the dialog first when it is not open', async () => {
    const isOpen = vi.fn(async () => false);
    const reopen = vi.fn(async () => undefined);
    const fn = vi.fn(async () => 'ok');

    const result = await withDialog({ isOpen, reopen }, fn);

    expect(result).toBe('ok');
    expect(reopen).toHaveBeenCalledOnce();
  });

  it('retries with a reopen after fn throws, then succeeds', async () => {
    const isOpen = vi.fn(async () => true);
    const reopen = vi.fn(async () => undefined);
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error('modal lost');
      return 'recovered';
    });

    const result = await withDialog({ isOpen, reopen }, fn, { retries: 1 });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error once retries are exhausted', async () => {
    const isOpen = vi.fn(async () => true);
    const reopen = vi.fn(async () => undefined);
    const fn = vi.fn(async () => {
      throw new Error('still broken');
    });

    await expect(withDialog({ isOpen, reopen }, fn, { retries: 1 })).rejects.toThrow(
      'still broken',
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
