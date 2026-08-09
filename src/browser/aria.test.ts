import { describe, expect, it, vi } from 'vitest';
import type { Locator, Page } from '@playwright/test';
import { byAriaLabel, clickByAriaLabel } from './aria.js';

function mockLocatorList(labels: string[], visibility: boolean[] = []) {
  const clicked: number[] = [];
  const nth = (i: number) =>
    ({
      getAttribute: vi.fn(async (name: string) => (name === 'aria-label' ? labels[i] ?? null : null)),
      isVisible: vi.fn(async () => visibility[i] ?? true),
      click: vi.fn(async () => {
        clicked.push(i);
      }),
      waitFor: vi.fn(async () => undefined),
    }) as unknown as Locator;

  const list = {
    count: vi.fn(async () => labels.length),
    nth: vi.fn((i: number) => nth(i)),
  } as unknown as Locator;

  return { list, clicked };
}

function mockRoot(labels: string[], visibility?: boolean[]) {
  const { list, clicked } = mockLocatorList(labels, visibility);
  const root = {
    locator: vi.fn(() => list),
  } as unknown as Page;
  return { root, clicked, list };
}

describe('byAriaLabel', () => {
  it('returns the first locator whose aria-label matches the pattern', async () => {
    const { root } = mockRoot(['Home', 'Edit AI Engineer at Levkin Inc.', 'Edit About']);
    const found = await byAriaLabel(root, /Edit.*at Levkin/i);
    expect(found).not.toBeNull();
    expect(await found!.getAttribute('aria-label')).toBe('Edit AI Engineer at Levkin Inc.');
  });

  it('returns null when nothing matches', async () => {
    const { root } = mockRoot(['Home', 'Notifications']);
    const found = await byAriaLabel(root, /Edit.*Nonexistent/i);
    expect(found).toBeNull();
  });

  it('is scoped to whatever root is passed (page or a narrower locator)', async () => {
    const { root: dialogRoot } = mockRoot(['Save', 'Cancel']);
    const found = await byAriaLabel(dialogRoot, /Save/);
    expect(found).not.toBeNull();
  });

  it('with preferVisible skips a hidden match and returns the visible twin', async () => {
    const { root, list } = mockRoot(
      ['Document options', 'Document options'],
      [false, true],
    );
    const found = await byAriaLabel(root, /^Document options$/i, { preferVisible: true });
    expect(found).not.toBeNull();
    // second candidate (index 1)
    expect(list.nth).toHaveBeenCalled();
    expect(await found!.isVisible()).toBe(true);
    expect(await found!.getAttribute('aria-label')).toBe('Document options');
  });

  it('with preferVisible falls back to the first match when all are hidden', async () => {
    const { root } = mockRoot(['Document options', 'Document options'], [false, false]);
    const found = await byAriaLabel(root, /^Document options$/i, { preferVisible: true });
    expect(found).not.toBeNull();
    expect(await found!.isVisible()).toBe(false);
  });
});

describe('clickByAriaLabel', () => {
  it('finds and clicks the matching element, returning its label', async () => {
    const { root, clicked } = mockRoot(['Home', 'Edit AI Engineer at Levkin Inc.'], [true, true]);
    const label = await clickByAriaLabel(root, /Edit.*at Levkin/i);
    expect(label).toBe('Edit AI Engineer at Levkin Inc.');
    expect(clicked).toEqual([1]);
  });

  it('defaults preferVisible and clicks the visible twin', async () => {
    const { root, clicked } = mockRoot(
      ['Document options', 'Document options'],
      [false, true],
    );
    const label = await clickByAriaLabel(root, /^Document options$/i);
    expect(label).toBe('Document options');
    expect(clicked).toEqual([1]);
  });

  it('with preferVisible: false clicks the first match even if hidden', async () => {
    const { root, clicked } = mockRoot(
      ['Document options', 'Document options'],
      [false, true],
    );
    await clickByAriaLabel(root, /^Document options$/i, { preferVisible: false, force: true });
    expect(clicked).toEqual([0]);
  });

  it('throws a descriptive error when nothing matches', async () => {
    const { root } = mockRoot(['Home']);
    await expect(clickByAriaLabel(root, /Edit.*Nonexistent/i)).rejects.toThrow(
      /no element with aria-label matching/,
    );
  });
});
