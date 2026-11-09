export const OWL_AVATAR_IDS = [
  'book',
  'gamer',
  'lab',
  'detective',
  'wizard',
  'sport',
  'explorer',
  'sleepy',
  'idea',
  'scholar',
  'astronaut',
  'chef',
  'artist',
  'musician',
  'hero',
  'firefighter',
  'pirate',
  'angel',
  'mechanic',
  'king',
] as const;

export type OwlAvatarId = (typeof OWL_AVATAR_IDS)[number];

export const DEFAULT_OWL_AVATAR_ID: OwlAvatarId = 'book';

export const OWL_AVATARS: ReadonlyArray<{
  id: OwlAvatarId;
  label: string;
}> = [
  { id: 'book', label: 'Libro' },
  { id: 'gamer', label: 'Gamer' },
  { id: 'lab', label: 'Ciencia' },
  { id: 'detective', label: 'Detective' },
  { id: 'wizard', label: 'Mago' },
  { id: 'sport', label: 'Deporte' },
  { id: 'explorer', label: 'Explorador' },
  { id: 'sleepy', label: 'Dormilón' },
  { id: 'idea', label: 'Idea' },
  { id: 'scholar', label: 'Estudioso' },
  { id: 'astronaut', label: 'Astronauta' },
  { id: 'chef', label: 'Chef' },
  { id: 'artist', label: 'Artista' },
  { id: 'musician', label: 'Músico' },
  { id: 'hero', label: 'Héroe' },
  { id: 'firefighter', label: 'Bombero' },
  { id: 'pirate', label: 'Pirata' },
  { id: 'angel', label: 'Ángel' },
  { id: 'mechanic', label: 'Mecánico' },
  { id: 'king', label: 'Rey' },
];

export function isOwlAvatarId(value: unknown): value is OwlAvatarId {
  return typeof value === 'string' && (OWL_AVATAR_IDS as readonly string[]).includes(value);
}

export function parseOwlAvatarId(value: unknown): OwlAvatarId {
  return isOwlAvatarId(value) ? value : DEFAULT_OWL_AVATAR_ID;
}

export function owlAvatarOf(value: unknown) {
  const id = parseOwlAvatarId(value);
  return OWL_AVATARS.find((avatar) => avatar.id === id)!;
}

export function owlAvatarSrc(id: OwlAvatarId) {
  return `/images/owls/${id}.png`;
}
