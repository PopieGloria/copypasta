// =============================================================================
// CopyPasta — Application Constants
// =============================================================================

/** Room TTL in milliseconds (24 hours) */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

/** Room TTL expressed as a PostgreSQL interval string */
export const ROOM_TTL_INTERVAL = '24 hours';

/** Debounce delay (ms) before writing text changes to the database */
export const DB_WRITE_DEBOUNCE_MS = 1500;

/** Supabase Realtime broadcast event name for text updates */
export const BROADCAST_EVENT_TEXT = 'text:update';

/** Supabase Realtime channel prefix */
export const CHANNEL_PREFIX = 'room:';

/** Max content length in characters (soft limit — enforce on backend too) */
export const MAX_CONTENT_LENGTH = 100_000;

/** Word list used to generate human-readable room codes */
export const WORD_LIST = [
  // Animals
  'tiger', 'falcon', 'panda', 'otter', 'crane', 'raven', 'lynx', 'bison',
  'whale', 'gecko', 'cobra', 'moose', 'eagle', 'badger', 'fox', 'wolf',
  'hawk', 'bear', 'deer', 'seal', 'mink', 'finch', 'dove', 'wren',
  // Nature
  'river', 'storm', 'ember', 'cloud', 'frost', 'cedar', 'coral', 'delta',
  'flame', 'grove', 'haven', 'marsh', 'peak', 'ridge', 'shore', 'tide',
  'vale', 'breeze', 'cove', 'dune', 'fern', 'glen', 'hollow', 'island',
  // Colors / Descriptors
  'amber', 'azure', 'blaze', 'crisp', 'swift', 'quiet', 'bright', 'dark',
  'deep', 'golden', 'ivory', 'jade', 'lunar', 'misty', 'noble', 'onyx',
  'polar', 'rapid', 'silent', 'teal', 'ultra', 'vivid', 'wild', 'zenith',
  // Space / Cosmos
  'comet', 'nebula', 'orbit', 'pulsar', 'quasar', 'solar', 'stellar', 'void',
  'cosmic', 'nova', 'lunar', 'eclipse', 'aurora', 'photon', 'radiant',
];
