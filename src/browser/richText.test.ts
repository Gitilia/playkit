import { describe, expect, it, vi } from 'vitest';
import type { Locator, Page } from '@playwright/test';
import { fillContentEditable } from './richText.js';

function mockLocator() {
  const pressed: string[] = [];
  const typed: string[] = [];
  const page = {
    keyboard: {
      press: vi.fn(async (key: string) => {
        pressed.push(key);
      }),
      type: vi.fn(async (text: string) => {
        typed.push(text);
      }),
    },
  } as unknown as Page;

  const locator = {
    waitFor: vi.fn(async () => undefined),
    click: vi.fn(async () => undefined),
    page: vi.fn(() => page),
  } as unknown as Locator;

  return { locator, page, pressed, typed };
}

describe('fillContentEditable', () => {
  it('clears the field and types each paragraph with a double-Enter break', async () => {
    const { locator, typed, pressed } = mockLocator();

    await fillContentEditable(locator, 'First bullet\n\nSecond bullet\n\nThird bullet');

    expect(typed).toEqual(['First bullet', 'Second bullet', 'Third bullet']);
    // Select-all + delete before typing.
    expect(pressed[0]).toMatch(/Meta\+A|Control\+A/);
    expect(pressed[1]).toBe('Backspace');
    // Two Enters between paragraphs, none trailing after the last one.
    const enters = pressed.filter((k) => k === 'Enter');
    expect(enters).toHaveLength(4); // 2 breaks * 2 Enters each
  });

  it('types a single Enter per break when paragraphBreak is "enter"', async () => {
    const { locator, pressed } = mockLocator();

    await fillContentEditable(locator, 'A\n\nB', { paragraphBreak: 'enter' });

    const enters = pressed.filter((k) => k === 'Enter');
    expect(enters).toHaveLength(1);
  });

  it('ignores blank/whitespace-only paragraphs', async () => {
    const { locator, typed } = mockLocator();

    await fillContentEditable(locator, 'A\n\n\n\nB\n\n   \n\nC');

    expect(typed).toEqual(['A', 'B', 'C']);
  });
});
