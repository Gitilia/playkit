/**
 * Unified mail-inbox helper: prefer Mailpit (homelab), else Mailtrap (SaaS).
 */
import { createLogger, type Logger } from '../logging/logger.js';
import { MailpitClient, loadMailpitConfig } from './mailpit.js';
import { MailtrapClient, loadMailtrapConfig } from './mailtrap.js';
import { extractLinks, firstLinkMatching } from './mailtrap.js';

export type MailInbox = MailpitClient | MailtrapClient;

export function createMailInbox(
  env: NodeJS.ProcessEnv = process.env,
  logger?: Logger,
): MailInbox | null {
  const log = logger ?? createLogger({ name: 'mail' });
  const provider = (env.PLAYKIT_MAIL_PROVIDER || env.MAIL_PROVIDER || '').toLowerCase();

  if (provider === 'mailtrap') {
    return MailtrapClient.fromEnv(env, log);
  }
  if (provider === 'mailpit' || loadMailpitConfig(env)) {
    const pit = MailpitClient.fromEnv(env, log);
    if (pit) return pit;
  }
  if (loadMailtrapConfig(env)) {
    return MailtrapClient.fromEnv(env, log);
  }
  return null;
}

/** Normalize HTML body from either Mailpit or Mailtrap message shapes. */
export async function readMailHtml(
  inbox: MailInbox,
  msg: { ID?: string; id?: number; HTML?: string; html_path?: string },
): Promise<string> {
  if (typeof msg.HTML === 'string' && msg.HTML.length > 0) return msg.HTML;
  if (inbox instanceof MailpitClient && msg.ID) {
    return inbox.getHtml(msg.ID);
  }
  if (inbox instanceof MailtrapClient && typeof msg.id === 'number') {
    return inbox.getHtml(msg.id, msg.html_path);
  }
  throw new Error('readMailHtml: unrecognized message shape');
}

export {
  MailpitClient,
  loadMailpitConfig,
  type MailpitConfig,
  type MailpitMessage,
  type WaitForMailpitOptions,
} from './mailpit.js';

export {
  MailtrapClient,
  loadMailtrapConfig,
  extractLinks,
  firstLinkMatching,
  type MailtrapConfig,
  type MailtrapMessage,
  type WaitForEmailOptions,
} from './mailtrap.js';
