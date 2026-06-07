export type LeadStatus = 'waiting' | 'ready-for-quote' | 'handoff' | 'opted-out';

export interface Lead {
  id: string;
  phoneNumber: string;
  optedOut: boolean;
  createdAt: string;
  status: LeadStatus | null;
  hasPhoto: boolean | null;
  hasLocation: boolean | null;
  suburb: string | null;
  postcode: string | null;
  updatedAt: string | null;
  summary: string | null;
  photoCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export interface MediaAttachment {
  id: string;
  sid: string;
  contentType: string | null;
}

export interface Message {
  id: string;
  callerId: string;
  twilioMessageSid: string;
  direction: 'inbound' | 'outbound';
  body: string | null;
  deliveryStatus: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  media: MediaAttachment[];
}

export interface LeadDetail extends Lead {
  messages: Message[];
}
