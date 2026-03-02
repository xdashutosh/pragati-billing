import { useMemo } from 'react';

/**
 * Groups an array of items (with a `category` field) by category,
 * returning the category names in insertion order and a map of
 * category → array-of-indices into the original array.
 */
export function useCategoryGrouping<T extends { category?: string }>(items: T[]): {
  grouped: Record<string, number[]>;
  categories: string[];
} {
  return useMemo(() => {
    const grouped: Record<string, number[]> = {};
    items.forEach((item, idx) => {
      const cat = item.category || '';
      if (!cat) return;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(idx);
    });
    return { grouped, categories: Object.keys(grouped) };
  }, [items]);
}
