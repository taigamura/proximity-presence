import apn from 'apn';

/**
 * Thin interface over APNs so the real provider and a test stub are
 * interchangeable.
 */
export interface PushProvider {
  sendSilentPush(apnsToken: string): Promise<void>;
}

/** Config read from environment variables at startup. */
export interface ApnsConfig {
  /** Base64-encoded APNs .p8 key file content. */
  keyBase64: string;
  keyId: string;
  teamId: string;
  /** APNs bundle ID (topic). */
  bundleId: string;
  production: boolean;
}

function readConfig(): ApnsConfig | null {
  const { APNS_KEY_BASE64, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, NODE_ENV } = process.env;
  if (!APNS_KEY_BASE64 || !APNS_KEY_ID || !APNS_TEAM_ID || !APNS_BUNDLE_ID) return null;
  return {
    keyBase64: APNS_KEY_BASE64,
    keyId: APNS_KEY_ID,
    teamId: APNS_TEAM_ID,
    bundleId: APNS_BUNDLE_ID,
    production: NODE_ENV === 'production',
  };
}

class ApnsProvider implements PushProvider {
  private provider: apn.Provider;
  private bundleId: string;

  constructor(config: ApnsConfig) {
    this.bundleId = config.bundleId;
    this.provider = new apn.Provider({
      token: {
        key: Buffer.from(config.keyBase64, 'base64'),
        keyId: config.keyId,
        teamId: config.teamId,
      },
      production: config.production,
    });
  }

  async sendSilentPush(apnsToken: string): Promise<void> {
    const note = new apn.Notification();
    note.topic = this.bundleId;
    // content-available: 1 makes this a silent background push.
    note.contentAvailable = true;
    note.priority = 5; // low-priority as required for silent pushes
    note.payload = {};

    const result = await this.provider.send(note, apnsToken);
    if (result.failed.length > 0) {
      const reason = result.failed[0]?.response?.reason ?? 'unknown';
      throw new Error(`APNs push failed: ${reason}`);
    }
  }
}

/** No-op provider used when APNs env vars are absent (dev / CI). */
class NoopPushProvider implements PushProvider {
  async sendSilentPush(_apnsToken: string): Promise<void> {
    // intentionally empty
  }
}

let _provider: PushProvider | null = null;

export function getPushProvider(): PushProvider {
  if (!_provider) {
    const config = readConfig();
    _provider = config ? new ApnsProvider(config) : new NoopPushProvider();
  }
  return _provider;
}

/** Replace the provider — used in tests. */
export function setPushProvider(provider: PushProvider | null): void {
  _provider = provider;
}
