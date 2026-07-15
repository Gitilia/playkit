import { describe, expect, it, vi } from 'vitest';
import type { Locator, Page } from '@playwright/test';
import { byAriaLabel, clickByAriaLabel } from './aria.js';

function mockLocatorList(labels: string[]) {
  const clicked: number[] = [];
  const nth = (i: number) =>
    ({
      getAttribute: vi.fn(async (name: string) => (name === 'aria-label' ? labels[i] ?? null : null)),
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

function mockRoot(labels: string[]) {
  const { list, clicked } = mockLocatorList(labels);
  const root = {
    locator: vi.fn(() => list),
  } as unknown as Page;
  return { root, clicked };
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
});

describe('clickByAriaLabel', () => {
  it('finds and clicks the matching element, returning its label', async () => {
    const { root, clicked } = mockRoot(['Home', 'Edit AI Engineer at Levkin Inc.']);
    const label = await clickByAriaLabel(root, /Edit.*at Levkin/i);
    expect(label).toBe('Edit AI Engineer at Levkin Inc.');
    expect(clicked).toEqual([1]);
  });

  it('throws a descriptive error when nothing matches', async () => {
    const { root } = mockRoot(['Home']);
    await expect(clickByAriaLabel(root, /Edit.*Nonexistent/i)).rejects.toThrow(
      /no element with aria-label matching/,
    );
  });
});
