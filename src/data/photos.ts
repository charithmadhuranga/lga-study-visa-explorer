/**
 * Bundled campus photos (copied from reference/img by `npm run data:import`).
 * `University.photo` holds the reference-relative path (`img/uni/<id>.webp`); this maps it
 * to the hashed asset URL Vite produced. Unknown paths return '' and the crest fallback shows.
 */

const PHOTOS = import.meta.glob('../assets/img/uni/*.webp', { eager: true, import: 'default' });

export function photoUrl(path: string): string {
  if (!path) return '';
  const file = path.split('/').pop();
  if (!file) return '';
  return (PHOTOS[`../assets/img/uni/${file}`] as string | undefined) ?? '';
}
