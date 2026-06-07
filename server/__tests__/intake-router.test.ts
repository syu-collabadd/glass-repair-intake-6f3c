import { routeIncoming, IncomingSMS, LeadStatus } from '../lib/intake-router';

function sms(overrides: Partial<IncomingSMS> = {}): IncomingSMS {
  return {
    messageSid: 'SMtest',
    from: '+61400000001',
    body: '',
    numMedia: 0,
    mediaUrls: [],
    mediaContentTypes: [],
    ...overrides,
  };
}

describe('routeIncoming', () => {
  const waiting: LeadStatus = 'waiting';

  test('STOP opts out caller', () => {
    const d = routeIncoming(sms({ body: 'STOP' }), waiting, false, false);
    expect(d.action).toBe('opt-out');
    expect(d.newStatus).toBe('opted-out');
  });

  test('STOP is case-insensitive', () => {
    const d = routeIncoming(sms({ body: 'stop' }), waiting, false, false);
    expect(d.action).toBe('opt-out');
  });

  test('HELP returns program info reply', () => {
    const d = routeIncoming(sms({ body: 'HELP' }), waiting, false, false);
    expect(d.action).toBe('help');
    expect(d.replyBody).toBeTruthy();
    expect(d.newStatus).toBe(waiting);
  });

  test('urgent keyword triggers handoff', () => {
    const d = routeIncoming(sms({ body: 'I need a human please' }), waiting, false, false);
    expect(d.action).toBe('handoff');
    expect(d.newStatus).toBe('handoff');
  });

  test('emergency keyword triggers handoff', () => {
    const d = routeIncoming(sms({ body: 'there was a break in!' }), waiting, false, false);
    expect(d.action).toBe('handoff');
  });

  test('photo only → need-location', () => {
    const d = routeIncoming(
      sms({ body: '', numMedia: 1, mediaUrls: ['https://twilio/img'], mediaContentTypes: ['image/jpeg'] }),
      waiting, false, false
    );
    expect(d.action).toBe('need-location');
    expect(d.hasPhoto).toBe(true);
    expect(d.hasLocation).toBe(false);
  });

  test('postcode only → need-photo', () => {
    const d = routeIncoming(sms({ body: 'Bondi 2026' }), waiting, false, false);
    expect(d.action).toBe('need-photo');
    expect(d.hasPhoto).toBe(false);
    expect(d.hasLocation).toBe(true);
    expect(d.postcode).toBe('2026');
  });

  test('photo + postcode → ready-for-quote', () => {
    const d = routeIncoming(
      sms({ body: 'Bondi 2026', numMedia: 1, mediaUrls: ['https://twilio/img'], mediaContentTypes: ['image/jpeg'] }),
      waiting, false, false
    );
    expect(d.action).toBe('ready-for-quote');
    expect(d.newStatus).toBe('ready-for-quote');
    expect(d.hasPhoto).toBe(true);
    expect(d.hasLocation).toBe(true);
  });

  test('accumulated: prior photo + new postcode → ready-for-quote', () => {
    const d = routeIncoming(sms({ body: 'Bondi 2026' }), waiting, true, false);
    expect(d.action).toBe('ready-for-quote');
  });

  test('accumulated: prior location + new photo → ready-for-quote', () => {
    const d = routeIncoming(
      sms({ body: '', numMedia: 1, mediaUrls: ['https://twilio/img'], mediaContentTypes: ['image/jpeg'] }),
      waiting, false, true, 'Bondi', '2026'
    );
    expect(d.action).toBe('ready-for-quote');
  });

  test('neither photo nor location → need-both', () => {
    const d = routeIncoming(sms({ body: 'hello' }), waiting, false, false);
    expect(d.action).toBe('need-both');
  });

  test('opted-out callers are ignored', () => {
    const d = routeIncoming(sms({ body: 'hi' }), 'opted-out', false, false);
    expect(d.action).toBe('already-opted-out');
    expect(d.newStatus).toBe('opted-out');
  });

  test('handoff leads do not get auto-reply on follow-up', () => {
    const d = routeIncoming(sms({ body: 'still here' }), 'handoff', false, false);
    expect(d.action).toBe('already-handoff');
    expect(d.replyBody).toBeUndefined();
  });

  test('duplicate STOP returns opt-out', () => {
    const d = routeIncoming(sms({ body: 'STOP' }), 'opted-out', false, false);
    expect(d.action).toBe('opt-out');
    expect(d.newStatus).toBe('opted-out');
  });
});
