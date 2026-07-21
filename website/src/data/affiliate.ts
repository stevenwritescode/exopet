// Your Amazon Associates tracking ID, e.g. 'exopet-20'. While empty,
// product links are plain vendor URLs with no affiliate tag.
export const AMAZON_TAG = '';

export function buildAffiliateUrl(url: string): string {
  if (!AMAZON_TAG || !url.includes('amazon.com')) return url;
  const u = new URL(url);
  u.searchParams.set('tag', AMAZON_TAG);
  return u.toString();
}
