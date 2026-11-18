export function toOptionalInteger(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.trim() === '') return undefined;
  return Number(value);
}

export function trimOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.trim() || undefined;
}

export function slugify(title: string): string {
  const slug = title
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 230)
    .replace(/-+$/g, '');
  return slug || 'article';
}