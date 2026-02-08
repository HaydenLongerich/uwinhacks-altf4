type Rng = () => number;

function xmur3(seed: string) {
  let hash = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return function nextHash() {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return hash >>> 0;
  };
}

function mulberry32(a: number): Rng {
  return function random() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRng(seed: string): Rng {
  const hash = xmur3(seed);
  return mulberry32(hash());
}

export function randomBetween(rng: Rng, min: number, max: number) {
  return min + (max - min) * rng();
}

export function pickWeighted<T>(
  rng: Rng,
  entries: Array<{ weight: number; value: T }>,
): T {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const threshold = rng() * totalWeight;
  let rolling = 0;

  for (const entry of entries) {
    rolling += entry.weight;
    if (threshold <= rolling) {
      return entry.value;
    }
  }

  return entries[entries.length - 1].value;
}
