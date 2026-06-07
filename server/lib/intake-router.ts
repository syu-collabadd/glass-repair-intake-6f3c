export interface IncomingSMS {
  messageSid: string;
  from: string;
  body: string;
  numMedia: number;
  mediaUrls: string[];
  mediaContentTypes: string[];
}

export type LeadStatus = 'waiting' | 'ready-for-quote' | 'handoff' | 'opted-out';

export interface IntakeDecision {
  action:
    | 'opt-out'
    | 'help'
    | 'handoff'
    | 'ready-for-quote'
    | 'need-photo'
    | 'need-location'
    | 'need-both'
    | 'already-done'
    | 'already-handoff'
    | 'already-opted-out'
    | 'ignored';
  replyBody?: string;
  newStatus: LeadStatus;
  hasPhoto: boolean;
  hasLocation: boolean;
  suburb?: string;
  postcode?: string;
}

const STOP_KEYWORDS = /^(stop|stopall|unsubscribe|cancel|end|quit)$/i;
const HELP_KEYWORDS = /^(help|info)$/i;
const URGENT_KEYWORDS =
  /\b(human|manager|call me|unsafe|emergency|break.?in|police|help me|burglary|robbery|intrusion|urgent|asap)\b/i;

const HELP_REPLY =
  'ClearView Glass Repair intake: reply with a photo of the damage and your suburb/postcode to get a quote. Reply STOP to opt out. For urgent help call 000.';

const INTRO_SMS =
  "Hi! Thanks for calling ClearView Glass Repair.\n\nTo prepare your quote, please reply with:\n1. A clear photo of the damaged glass\n2. Your suburb and postcode (e.g., \"Bondi 2026\")\n\nReply HELP for assistance or STOP to opt out.";

export function getIntroSMS(): string {
  return INTRO_SMS;
}

function extractLocation(body: string): { suburb?: string; postcode?: string; found: boolean } {
  // Australian postcode: 4-digit number starting with 2-9 (or 0 for ACT/NT)
  const postcodeMatch = body.match(/\b([02-9]\d{3})\b/);
  const postcode = postcodeMatch?.[1];

  const ignore = new Set([
    'yes', 'no', 'ok', 'okay', 'hi', 'hey', 'hello', 'thanks', 'thank',
    'you', 'the', 'a', 'an', 'is', 'in', 'at', 'for', 'it', 'and', 'here',
    'this', 'my', 'i', 'send', 'have', 'got', 'photo', 'image', 'pic',
    'picture', 'glass', 'window', 'broken', 'cracked', 'damaged', 'damage',
    'please', 'can', 'could', 'would', 'just', 'really', 'very', 'too',
    'from', 'to', 'of', 'on', 'with', 'by', 'are', 'was', 'be', 'will',
  ]);

  const cleaned = body
    .replace(/\b[02-9]\d{3}\b/g, '')
    .replace(/[^\w\s]/g, ' ')
    .trim();

  const words = cleaned
    .split(/\s+/)
    .filter(w => w.length >= 2 && !ignore.has(w.toLowerCase()));

  let suburb: string | undefined;
  if (words.length > 0 && words.length <= 5) {
    suburb = words.slice(0, 3).join(' ');
  }

  return {
    postcode,
    suburb,
    found: !!(postcode || (suburb && suburb.length >= 3)),
  };
}

function hasImageMedia(mediaUrls: string[], mediaContentTypes: string[]): boolean {
  return mediaContentTypes.some(ct => ct.startsWith('image/'));
}

export function routeIncoming(
  sms: IncomingSMS,
  currentStatus: LeadStatus,
  existingHasPhoto: boolean,
  existingHasLocation: boolean,
  existingSuburb?: string | null,
  existingPostcode?: string | null
): IntakeDecision {
  const trimmed = sms.body.trim();

  // STOP — opt out
  if (STOP_KEYWORDS.test(trimmed)) {
    return {
      action: 'opt-out',
      newStatus: 'opted-out',
      hasPhoto: existingHasPhoto,
      hasLocation: existingHasLocation,
      suburb: existingSuburb ?? undefined,
      postcode: existingPostcode ?? undefined,
    };
  }

  // Already opted out — do nothing
  if (currentStatus === 'opted-out') {
    return {
      action: 'already-opted-out',
      newStatus: 'opted-out',
      hasPhoto: existingHasPhoto,
      hasLocation: existingHasLocation,
    };
  }

  // HELP
  if (HELP_KEYWORDS.test(trimmed)) {
    return {
      action: 'help',
      replyBody: HELP_REPLY,
      newStatus: currentStatus,
      hasPhoto: existingHasPhoto,
      hasLocation: existingHasLocation,
      suburb: existingSuburb ?? undefined,
      postcode: existingPostcode ?? undefined,
    };
  }

  // Urgent / handoff keywords
  if (URGENT_KEYWORDS.test(trimmed)) {
    return {
      action: 'handoff',
      replyBody:
        "We've flagged your message for urgent attention. An operator will contact you shortly. If this is a police matter or emergency, please call 000.",
      newStatus: 'handoff',
      hasPhoto: existingHasPhoto,
      hasLocation: existingHasLocation,
      suburb: existingSuburb ?? undefined,
      postcode: existingPostcode ?? undefined,
    };
  }

  // Already handed off — just store, no new auto-reply
  if (currentStatus === 'handoff') {
    return {
      action: 'already-handoff',
      newStatus: 'handoff',
      hasPhoto: existingHasPhoto,
      hasLocation: existingHasLocation,
    };
  }

  // Accumulate facts
  const newPhoto = existingHasPhoto || hasImageMedia(sms.mediaUrls, sms.mediaContentTypes);
  const locResult = extractLocation(trimmed);
  const newLocation = existingHasLocation || locResult.found;
  const newSuburb = locResult.suburb ?? existingSuburb ?? undefined;
  const newPostcode = locResult.postcode ?? existingPostcode ?? undefined;

  if (newPhoto && newLocation) {
    return {
      action: 'ready-for-quote',
      newStatus: 'ready-for-quote',
      hasPhoto: true,
      hasLocation: true,
      suburb: newSuburb,
      postcode: newPostcode,
    };
  }

  if (newPhoto && !newLocation) {
    return {
      action: 'need-location',
      replyBody:
        "Thanks for the photo! What's the suburb and postcode for the damage? (e.g., \"Bondi 2026\")",
      newStatus: 'waiting',
      hasPhoto: true,
      hasLocation: false,
      suburb: newSuburb,
      postcode: newPostcode,
    };
  }

  if (!newPhoto && newLocation) {
    return {
      action: 'need-photo',
      replyBody:
        "Thanks! Could you please also send a clear photo of the damaged glass so we can prepare your quote?",
      newStatus: 'waiting',
      hasPhoto: false,
      hasLocation: true,
      suburb: newSuburb,
      postcode: newPostcode,
    };
  }

  return {
    action: 'need-both',
    replyBody:
      "To prepare your quote we need:\n1. A photo of the damaged glass\n2. Your suburb and postcode (e.g., \"Bondi 2026\")\n\nPlease reply with both.",
    newStatus: 'waiting',
    hasPhoto: false,
    hasLocation: false,
  };
}
