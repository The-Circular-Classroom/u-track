import { describe, it, expect } from 'vitest';
import {
  CATEGORY_ROWS,
  CATEGORY_ORDER,
  CATEGORY_DISPLAY_LABELS,
  groupCategoryName,
  getCategoryOrder,
} from '../categoryOrder';

describe('categoryOrder', () => {
  it('has exactly 4 rows in CATEGORY_ROWS matching layout specifications', () => {
    expect(CATEGORY_ROWS).toHaveLength(4);
    expect(CATEGORY_ROWS[0]).toEqual(['uniform_shirt', 'uniform_skirt_group', 'uniform_shorts', 'uniform_pants']);
    expect(CATEGORY_ROWS[1]).toEqual(['polo_shirt', 'house_shirt', 'pe_shirt', 'pe_shorts']);
    expect(CATEGORY_ROWS[2]).toEqual(['tie', 'belt', 'cap']);
    expect(CATEGORY_ROWS[3]).toEqual(['others']);
  });

  it('maps gym shorts to others', () => {
    expect(groupCategoryName('gym_shorts')).toBe('others');
    expect(groupCategoryName('gym shorts')).toBe('others');
    expect(groupCategoryName('GYM SHORTS')).toBe('others');
  });

  it('maps uniform skirts, skorts, pinafores to uniform_skirt_group', () => {
    expect(groupCategoryName('uniform skirt')).toBe('uniform_skirt_group');
    expect(groupCategoryName('skort')).toBe('uniform_skirt_group');
    expect(groupCategoryName('pinafore')).toBe('uniform_skirt_group');
  });

  it('correctly maps canonical order indices', () => {
    expect(getCategoryOrder('uniform_shirt')).toBeLessThan(getCategoryOrder('polo_shirt'));
    expect(getCategoryOrder('polo_shirt')).toBeLessThan(getCategoryOrder('tie'));
    expect(getCategoryOrder('tie')).toBeLessThan(getCategoryOrder('others'));
  });
});
