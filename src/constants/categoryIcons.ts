import { IconName } from '../components/Icon';

export const CATEGORY_ICONS: Record<string, IconName> = {
  Food: 'food',
  Transport: 'transport',
  Shopping: 'shopping',
  Bills: 'bills',
  Entertainment: 'entertainment',
  Health: 'health',
  Transfer: 'transfer',
  Other: 'other',
};

export function categoryIcon(name: string | undefined | null): IconName {
  if (!name) return 'other';
  return CATEGORY_ICONS[name] ?? 'other';
}
