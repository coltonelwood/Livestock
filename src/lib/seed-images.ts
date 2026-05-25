/**
 * Category-matched marketplace imagery (royalty-free ranch/cattle/beef photos in
 * /public/seed). Used as a believable fallback when an item has no uploaded
 * photo, so the public marketplace never looks empty. A deterministic id-hash
 * spreads images so the same shot doesn't repeat across a grid.
 *
 * These are illustrative category images for browse/discovery, NOT a claim about
 * the specific animal — real seller-uploaded photos always take precedence.
 */

const DARK = ["/seed/cattle-black.webp", "/seed/cattle-herd.webp", "/seed/cattle-calf.webp"];
const RED = ["/seed/cattle-red.webp", "/seed/cattle-hereford.webp", "/seed/cattle-herd.webp"];
const HEREFORD = ["/seed/cattle-hereford.webp", "/seed/cattle-red.webp"];
const PALE = ["/seed/cattle-herd.webp", "/seed/cattle-black.webp"]; // herd has cream/charolais-like cattle
const CATTLE = ["/seed/cattle-herd.webp", "/seed/cattle-black.webp", "/seed/cattle-red.webp", "/seed/cattle-hereford.webp", "/seed/cattle-calf.webp"];
const RANCH = ["/seed/ranch-field.webp", "/seed/ranch-mountains.webp", "/seed/ranch-grassland.webp", "/seed/ranch-barn.webp"];
const BEEF = ["/seed/beef-ribeye.webp", "/seed/beef-filet.webp", "/seed/beef-board.webp", "/seed/beef-steak.webp"];
const AUCTION = ["/seed/ranch-barn.webp", "/seed/cattle-herd.webp", "/seed/cattle-hereford.webp"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function pick(arr: string[], key: string): string {
  return arr[hash(key) % arr.length];
}

export function listingSeedImage(o: {
  id: string;
  species?: string | null;
  breed?: string | null;
}): string {
  // Only cattle imagery is on hand; for other species fall back to ranch land
  // (neutral) rather than showing the wrong animal.
  if (o.species && o.species !== "cattle") return pick(RANCH, o.id);
  const b = (o.breed ?? "").toLowerCase();
  let set = CATTLE;
  if (/hereford|baldy|tiger/.test(b)) set = HEREFORD;
  else if (/red\s*angus|^red\b|\bred\b/.test(b)) set = RED;
  else if (/charolais|white|cream/.test(b)) set = PALE;
  else if (/angus|brangus|wagyu|black/.test(b)) set = DARK;
  return pick(set, o.id);
}

export function beefSeedImage(o: { id: string }): string {
  return pick(BEEF, o.id);
}

export function auctionSeedImage(o: { id: string }): string {
  return pick(AUCTION, o.id);
}

export function ranchSeedImage(o: { id: string }): string {
  return pick(RANCH, o.id);
}
