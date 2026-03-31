const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

const DEFAULT_IMAP_HOST = 'imap.hostinger.com';
const DEFAULT_IMAP_PORT = 993;
const DEFAULT_MAILBOX = 'INBOX';
const DEFAULT_ARCHIVE_MAILBOX = 'Archive';
const DEFAULT_TRASH_MAILBOX = 'Trash';
const DEFAULT_SYNC_INTERVAL_MS = 60 * 1000;
const DEFAULT_FETCH_LIMIT = 80;
const DEFAULT_ATTACHMENT_DOWNLOAD_LIMIT = 15 * 1024 * 1024;

function createSyncState() {
  return {
    activePromise: null,
    lastSyncedAt: null,
    lastError: null,
    lastErrorAt: null,
    totalInMailbox: 0,
    unreadInMailbox: 0,
    mailbox: null,
  };
}

const syncState = {
  inbox: createSyncState(),
  archive: createSyncState(),
  trash: createSyncState(),
};

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseInteger(value, fallback, bounds = {}) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return fallback;

  let next = parsed;
  if (typeof bounds.min === 'number') next = Math.max(bounds.min, next);
  if (typeof bounds.max === 'number') next = Math.min(bounds.max, next);
  return next;
}

function getMailboxConfig() {
  const secure = parseBoolean(process.env.EMAIL_IMAP_SECURE, true);
  const portFallback = secure ? DEFAULT_IMAP_PORT : 143;

  const user = String(
    process.env.EMAIL_IMAP_USER ||
      process.env.IMAP_USER ||
      process.env.EMAIL_USER ||
      '',
  ).trim();

  const pass = String(
    process.env.EMAIL_IMAP_PASS ||
      process.env.IMAP_PASS ||
      process.env.EMAIL_PASS ||
      '',
  ).trim();

  return {
    enabled: Boolean(user && pass),
    host: String(process.env.EMAIL_IMAP_HOST || process.env.IMAP_HOST || DEFAULT_IMAP_HOST).trim() || DEFAULT_IMAP_HOST,
    port: parseInteger(process.env.EMAIL_IMAP_PORT || process.env.IMAP_PORT, portFallback, { min: 1, max: 65535 }),
    secure,
    mailbox: String(process.env.EMAIL_IMAP_MAILBOX || process.env.IMAP_MAILBOX || DEFAULT_MAILBOX).trim() || DEFAULT_MAILBOX,
    archiveMailbox: String(process.env.EMAIL_IMAP_ARCHIVE_MAILBOX || process.env.IMAP_ARCHIVE_MAILBOX || '').trim() || null,
    trashMailbox: String(process.env.EMAIL_IMAP_TRASH_MAILBOX || process.env.IMAP_TRASH_MAILBOX || '').trim() || null,
    user,
    pass,
    syncIntervalMs: parseInteger(process.env.EMAIL_IMAP_SYNC_INTERVAL_MS, DEFAULT_SYNC_INTERVAL_MS, {
      min: 10 * 1000,
      max: 15 * 60 * 1000,
    }),
    fetchLimit: parseInteger(process.env.EMAIL_IMAP_FETCH_LIMIT, DEFAULT_FETCH_LIMIT, {
      min: 10,
      max: 200,
    }),
  };
}

function normalizeMailboxScope(value) {
  const normalized = String(value || 'inbox').trim().toLowerCase();
  if (normalized === 'archive' || normalized === 'trash') {
    return normalized;
  }

  return 'inbox';
}

function getDefaultMailboxPath(config, scope) {
  if (scope === 'archive') {
    return config.archiveMailbox || DEFAULT_ARCHIVE_MAILBOX;
  }

  if (scope === 'trash') {
    return config.trashMailbox || DEFAULT_TRASH_MAILBOX;
  }

  return config.mailbox;
}

function getScopeState(scope) {
  return syncState[normalizeMailboxScope(scope)];
}

function getScopeFromMailboxPath(config, mailboxPath) {
  const normalizedMailboxPath = String(mailboxPath || config.mailbox).trim().toLowerCase();
  const candidates = [
    ['inbox', [syncState.inbox.mailbox, config.mailbox, DEFAULT_MAILBOX]],
    ['archive', [syncState.archive.mailbox, config.archiveMailbox, DEFAULT_ARCHIVE_MAILBOX]],
    ['trash', [syncState.trash.mailbox, config.trashMailbox, DEFAULT_TRASH_MAILBOX]],
  ];

  for (const [scope, values] of candidates) {
    const hasMatch = values.some((value) => String(value || '').trim().toLowerCase() === normalizedMailboxPath);
    if (hasMatch) {
      return scope;
    }
  }

  return 'inbox';
}

function buildSyncStatus(config, scope = 'inbox', mailboxPath) {
  const normalizedScope = normalizeMailboxScope(scope);
  const state = getScopeState(normalizedScope);

  return {
    enabled: config.enabled,
    mailbox: mailboxPath || state.mailbox || getDefaultMailboxPath(config, normalizedScope),
    syncing: Boolean(state.activePromise),
    lastSyncedAt: state.lastSyncedAt ? new Date(state.lastSyncedAt).toISOString() : null,
    lastError: state.lastError,
    lastErrorAt: state.lastErrorAt ? new Date(state.lastErrorAt).toISOString() : null,
    totalInMailbox: state.totalInMailbox,
    unreadInMailbox: state.unreadInMailbox,
  };
}

function createImapClient(config) {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    logger: false,
    disableAutoIdle: true,
    greetingTimeout: 15_000,
    connectionTimeout: 30_000,
    socketTimeout: 120_000,
  });
}

async function withImapClient(config, handler) {
  const client = createImapClient(config);
  client.on('error', (error) => {
    console.error('[admin-inbox] IMAP error:', error?.message || error);
  });

  await client.connect();

  try {
    return await handler(client);
  } finally {
    if (client.usable) {
      await client.logout().catch(() => {
        client.close();
      });
    } else {
      client.close();
    }
  }
}

function normalizeEmail(value, fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || fallback;
}

function normalizeMessageId(value, uid) {
  const normalized = String(value || '').trim();
  return normalized || `imap-uid-${uid}`;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<\/(p|div|br|li|tr|h[1-6]|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function normalizeBody(text, html) {
  const candidate = String(text || stripHtml(html)).replace(/\r\n/g, '\n').replace(/\u0000/g, '');
  const collapsed = candidate.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
  return collapsed || 'Aucun contenu texte disponible.';
}

function getStatusFromFlags(flags) {
  const normalizedFlags = flags instanceof Set ? flags : new Set(Array.isArray(flags) ? flags : []);
  if (normalizedFlags.has('\\Answered')) return 'REPLIED';
  if (normalizedFlags.has('\\Seen')) return 'READ';
  return 'UNREAD';
}

function toDate(value) {
  const candidate = value instanceof Date ? value : new Date(value || Date.now());
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
}

function extractAttachmentsFromBodyStructure(node, path = []) {
  if (!node || typeof node !== 'object') {
    return [];
  }

  const rawType = String(node.type || '').toLowerCase().trim();
  const [majorType, subtypeFromType] = rawType.split('/');
  const type = majorType || rawType;
  const subtype = String(node.subtype || subtypeFromType || '').toLowerCase().trim() || 'octet-stream';
  const disposition = String(node.disposition || '').toLowerCase();
  const filename = String(node.dispositionParameters?.filename || node.parameters?.name || '').trim();
  const part = path.length ? path.join('.') : '1';
  const isAttachment =
    disposition === 'attachment' ||
    (disposition === 'inline' && Boolean(filename)) ||
    (type && type !== 'text' && type !== 'multipart' && !disposition && Boolean(filename));

  const attachments = [];

  if (isAttachment) {
    attachments.push({
      part,
      filename: filename || `attachment-${part}`,
      contentType: `${type || 'application'}/${subtype}`,
      size: Number(node.size || 0),
      encoding: String(node.encoding || '').trim() || null,
      inline: disposition === 'inline',
    });
  }

  if (Array.isArray(node.childNodes) && node.childNodes.length) {
    node.childNodes.forEach((childNode, index) => {
      attachments.push(...extractAttachmentsFromBodyStructure(childNode, [...path, index + 1]));
    });
  }

  return attachments;
}

function normalizeAttachmentsValue(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const part = String(item?.part || '').trim();
      if (!part) return null;

      return {
        part,
        filename: String(item?.filename || `attachment-${part}`).trim() || `attachment-${part}`,
        contentType: String(item?.contentType || 'application/octet-stream').trim() || 'application/octet-stream',
        size: Number(item?.size || 0),
        encoding: item?.encoding ? String(item.encoding) : null,
        inline: Boolean(item?.inline),
      };
    })
    .filter(Boolean);
}

function serializeTicket(ticket) {
  return {
    id: ticket.id,
    messageId: ticket.messageId ?? null,
    imapUid: ticket.imapUid ?? null,
    mailboxPath: ticket.mailboxPath || DEFAULT_MAILBOX,
    senderEmail: ticket.senderEmail,
    senderName: ticket.senderName ?? null,
    subject: ticket.subject,
    body: ticket.body,
    attachments: normalizeAttachmentsValue(ticket.attachments),
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

async function readInboxState(prisma, config, options = {}) {
  const scope = normalizeMailboxScope(options.scope);
  const limit = parseInteger(options.limit, 60, { min: 1, max: 200 });
  const mailboxPath = String(options.mailboxPath || getDefaultMailboxPath(config, scope)).trim() || config.mailbox;
  const mailboxFilter = {
    mailboxPath,
    messageId: {
      not: null,
    },
  };

  const [items, totalCount, unreadCount, repliedCount, latestTicket] = await Promise.all([
    prisma.supportTicket.findMany({
      where: mailboxFilter,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    }),
    prisma.supportTicket.count({ where: mailboxFilter }),
    prisma.supportTicket.count({ where: { ...mailboxFilter, status: 'UNREAD' } }),
    prisma.supportTicket.count({ where: { ...mailboxFilter, status: 'REPLIED' } }),
    prisma.supportTicket.findFirst({
      where: mailboxFilter,
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  return {
    items: items.map(serializeTicket),
    summary: {
      totalCount,
      unreadCount,
      repliedCount,
      readCount: Math.max(0, totalCount - unreadCount - repliedCount),
      lastMessageAt: latestTicket?.createdAt ? latestTicket.createdAt.toISOString() : null,
    },
    sync: buildSyncStatus(config, scope, mailboxPath),
  };
}

async function withMailbox(config, options, handler) {
  return withImapClient(config, async (client) => {
    const lock = await client.getMailboxLock(options.mailboxPath || config.mailbox, {
      readOnly: Boolean(options.readOnly),
      description: options.description || 'admin-inbox',
    });

    try {
      return await handler(client);
    } finally {
      lock.release();
    }
  });
}

async function resolveMailboxPath(client, config, scope, options = {}) {
  const normalizedScope = normalizeMailboxScope(scope);
  if (normalizedScope === 'inbox') {
    return {
      path: config.mailbox,
      exists: true,
    };
  }

  const fallbackPath = getDefaultMailboxPath(config, normalizedScope);
  const explicitPath = normalizedScope === 'archive' ? config.archiveMailbox : config.trashMailbox;
  const specialUse = normalizedScope === 'archive' ? '\\Archive' : '\\Trash';
  const mailboxes = await client.list();

  if (explicitPath) {
    const existingExplicit = mailboxes.find((mailbox) => mailbox.path.toLowerCase() === explicitPath.toLowerCase());
    if (existingExplicit) {
      return { path: existingExplicit.path, exists: true };
    }

    if (!options.createIfMissing) {
      return { path: explicitPath, exists: false };
    }

    const createdExplicit = await client.mailboxCreate(explicitPath);
    return { path: createdExplicit.path || explicitPath, exists: true };
  }

  const specialUseMailbox = mailboxes.find((mailbox) => mailbox.specialUse === specialUse);
  if (specialUseMailbox) {
    return { path: specialUseMailbox.path, exists: true };
  }

  const namedMailbox = mailboxes.find(
    (mailbox) =>
      mailbox.path.toLowerCase() === fallbackPath.toLowerCase() ||
      mailbox.name.toLowerCase() === fallbackPath.toLowerCase(),
  );
  if (namedMailbox) {
    return { path: namedMailbox.path, exists: true };
  }

  if (!options.createIfMissing) {
    return { path: fallbackPath, exists: false };
  }

  const createdMailbox = await client.mailboxCreate(fallbackPath);
  return { path: createdMailbox.path || fallbackPath, exists: true };
}

async function syncAdminInbox(prisma, options = {}) {
  const config = getMailboxConfig();
  const scope = normalizeMailboxScope(options.scope);
  const force = Boolean(options.force);
  const scopeState = getScopeState(scope);
  const fallbackMailboxPath = getDefaultMailboxPath(config, scope);

  if (!config.enabled) {
    scopeState.lastError = 'Configuration IMAP manquante. Renseignez EMAIL_IMAP_USER et EMAIL_IMAP_PASS, ou reutilisez EMAIL_USER et EMAIL_PASS.';
    scopeState.lastErrorAt = Date.now();
    scopeState.mailbox = fallbackMailboxPath;
    return buildSyncStatus(config, scope, fallbackMailboxPath);
  }

  if (scopeState.activePromise) {
    return scopeState.activePromise;
  }

  if (!force && scopeState.lastSyncedAt && Date.now() - scopeState.lastSyncedAt < config.syncIntervalMs) {
    return buildSyncStatus(config, scope);
  }

  scopeState.activePromise = (async () => {
    let resolvedMailboxPath = fallbackMailboxPath;

    try {
      await withImapClient(config, async (client) => {
        const mailboxInfo = await resolveMailboxPath(client, config, scope, {
          createIfMissing: false,
        });

        resolvedMailboxPath = mailboxInfo.path || fallbackMailboxPath;
        scopeState.mailbox = resolvedMailboxPath;

        if (!mailboxInfo.exists && scope !== 'inbox') {
          scopeState.totalInMailbox = 0;
          scopeState.unreadInMailbox = 0;
          return;
        }

        const lock = await client.getMailboxLock(resolvedMailboxPath, {
          readOnly: true,
          description: `admin-inbox-sync-${scope}`,
        });

        try {
          scopeState.totalInMailbox = Number(client.mailbox?.exists || 0);
          scopeState.unreadInMailbox = Number(client.mailbox?.unseen || 0);

          if (!scopeState.totalInMailbox) {
            return;
          }

          const allUids = await client.search({ all: true }, { uid: true });
          const recentUids = allUids.slice(-config.fetchLimit);

          if (!recentUids.length) {
            return;
          }

          const messages = await client.fetchAll(
            recentUids,
            {
              bodyStructure: true,
              envelope: true,
              flags: true,
              internalDate: true,
              source: true,
            },
            { uid: true },
          );

          const normalizedMessages = [];

          for (const message of messages) {
            const parsed = await simpleParser(message.source);
            const envelopeFrom = Array.isArray(message.envelope?.from) ? message.envelope.from[0] : null;
            const parsedFrom = Array.isArray(parsed.from?.value) ? parsed.from.value[0] : null;
            const senderFallback = `unknown-${message.uid}@mail.bolo237.local`;

            normalizedMessages.push({
              messageId: normalizeMessageId(parsed.messageId || message.envelope?.messageId, message.uid),
              imapUid: Number(message.uid),
              senderEmail: normalizeEmail(parsedFrom?.address || envelopeFrom?.address, senderFallback),
              senderName: String(parsedFrom?.name || envelopeFrom?.name || '').trim() || null,
              subject: String(parsed.subject || message.envelope?.subject || 'Sans sujet').trim() || 'Sans sujet',
              body: normalizeBody(parsed.text, parsed.html),
              attachments: extractAttachmentsFromBodyStructure(message.bodyStructure),
              status: getStatusFromFlags(message.flags),
              createdAt: toDate(parsed.date || message.envelope?.date || message.internalDate),
            });
          }

          const existingTickets = await prisma.supportTicket.findMany({
            where: {
              messageId: {
                in: normalizedMessages.map((item) => item.messageId),
              },
            },
            select: {
              id: true,
              messageId: true,
              status: true,
            },
          });

          const existingByMessageId = new Map(existingTickets.map((item) => [item.messageId, item]));

          for (const item of normalizedMessages) {
            const existing = existingByMessageId.get(item.messageId);
            const nextStatus = item.status === 'REPLIED'
              ? 'REPLIED'
              : existing?.status === 'REPLIED'
                ? 'REPLIED'
                : item.status;

            await prisma.supportTicket.upsert({
              where: { messageId: item.messageId },
              update: {
                imapUid: item.imapUid,
                mailboxPath: resolvedMailboxPath,
                senderEmail: item.senderEmail,
                senderName: item.senderName,
                subject: item.subject,
                body: item.body,
                attachments: item.attachments,
                status: nextStatus,
              },
              create: {
                messageId: item.messageId,
                imapUid: item.imapUid,
                mailboxPath: resolvedMailboxPath,
                senderEmail: item.senderEmail,
                senderName: item.senderName,
                subject: item.subject,
                body: item.body,
                attachments: item.attachments,
                status: nextStatus,
                createdAt: item.createdAt,
              },
            });
          }
        } finally {
          lock.release();
        }
      });

      scopeState.lastSyncedAt = Date.now();
      scopeState.lastError = null;
      scopeState.lastErrorAt = null;
    } catch (error) {
      scopeState.lastError = error instanceof Error ? error.message : 'Erreur de synchronisation IMAP.';
      scopeState.lastErrorAt = Date.now();
      console.error(`[admin-inbox] ${scope} sync failure:`, error);
    } finally {
      scopeState.mailbox = resolvedMailboxPath;
      scopeState.activePromise = null;
    }

    return buildSyncStatus(config, scope, resolvedMailboxPath);
  })();

  return scopeState.activePromise;
}

async function getAdminInbox(prisma, options = {}) {
  const config = getMailboxConfig();
  const scope = normalizeMailboxScope(options.scope);
  const sync = await syncAdminInbox(prisma, { ...options, scope });
  return readInboxState(prisma, config, {
    ...options,
    scope,
    mailboxPath: sync.mailbox,
  });
}

async function getAdminInboxSummary(prisma, options = {}) {
  const scope = normalizeMailboxScope(options.scope);
  const snapshot = await getAdminInbox(prisma, { ...options, scope, limit: 1 });
  return {
    summary: snapshot.summary,
    sync: snapshot.sync,
  };
}

async function addFlagsToMessage(ticket, flags) {
  const config = getMailboxConfig();
  if (!config.enabled || !ticket.imapUid) {
    return false;
  }

  const scope = getScopeFromMailboxPath(config, ticket.mailboxPath);
  const scopeState = getScopeState(scope);

  await withMailbox(
    config,
    {
      readOnly: false,
      mailboxPath: ticket.mailboxPath || config.mailbox,
      description: 'admin-inbox-update-flags',
    },
    async (client) => {
      await client.messageFlagsAdd(ticket.imapUid, flags, { uid: true });
      scopeState.totalInMailbox = Number(client.mailbox?.exists || scopeState.totalInMailbox || 0);
      scopeState.unreadInMailbox = Number(client.mailbox?.unseen || scopeState.unreadInMailbox || 0);
    },
  );

  return true;
}

async function resolveTargetMailbox(client, config, target) {
  const resolved = await resolveMailboxPath(client, config, target, {
    createIfMissing: true,
  });
  return resolved.path;
}

async function moveMessageToMailbox(client, uid, destinationPath) {
  try {
    return await client.messageMove(uid, destinationPath, { uid: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '');
    if (!/move|capability|unsupported|unknown command/i.test(message)) {
      throw error;
    }

    const copied = await client.messageCopy(uid, destinationPath, { uid: true });
    await client.messageDelete(uid, { uid: true });
    return copied;
  }
}

async function moveAdminInboxTicket(prisma, ticketId, target) {
  const normalizedId = parseInteger(ticketId, NaN, { min: 1 });
  if (!Number.isFinite(normalizedId)) {
    throw new Error('Identifiant de ticket invalide.');
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: normalizedId } });
  if (!ticket) {
    const error = new Error('Ticket introuvable.');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (!ticket.messageId || !ticket.imapUid) {
    throw new Error('Ce ticket ne provient pas de la boite IMAP.');
  }

  const config = getMailboxConfig();
  if (!config.enabled) {
    throw new Error('Configuration IMAP indisponible.');
  }

  const sourceMailbox = String(ticket.mailboxPath || config.mailbox || DEFAULT_MAILBOX).trim() || config.mailbox;
  const sourceScope = getScopeFromMailboxPath(config, sourceMailbox);
  let destinationPath = sourceMailbox;
  let nextUid = null;

  await withMailbox(
    config,
    {
      readOnly: false,
      mailboxPath: sourceMailbox,
      description: `admin-inbox-${target}`,
    },
    async (client) => {
      destinationPath = await resolveTargetMailbox(client, config, target);

      if (destinationPath === sourceMailbox) {
        return;
      }

      const result = await moveMessageToMailbox(client, ticket.imapUid, destinationPath);
      if (result?.uidMap && typeof result.uidMap.get === 'function') {
        const mappedUid = result.uidMap.get(ticket.imapUid);
        nextUid = Number.isFinite(mappedUid) ? Number(mappedUid) : null;
      }
    },
  );

  if (destinationPath === sourceMailbox) {
    return {
      success: true,
      message: target === 'archive' ? 'Email deja archive.' : 'Email deja deplace dans la corbeille.',
      item: serializeTicket(ticket),
    };
  }

  getScopeState(sourceScope).lastSyncedAt = null;
  getScopeState(target).lastSyncedAt = null;

  const updated = await prisma.supportTicket.update({
    where: { id: normalizedId },
    data: {
      mailboxPath: destinationPath,
      imapUid: nextUid,
    },
  });

  return {
    success: true,
    message: target === 'archive' ? 'Email archive dans Hostinger.' : 'Email deplace dans la corbeille Hostinger.',
    item: serializeTicket(updated),
  };
}

async function archiveAdminInboxTicket(prisma, ticketId) {
  return moveAdminInboxTicket(prisma, ticketId, 'archive');
}

async function trashAdminInboxTicket(prisma, ticketId) {
  return moveAdminInboxTicket(prisma, ticketId, 'trash');
}

async function markAdminInboxTicketRead(prisma, ticketId) {
  const normalizedId = parseInteger(ticketId, NaN, { min: 1 });
  if (!Number.isFinite(normalizedId)) {
    throw new Error('Identifiant de ticket invalide.');
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: normalizedId } });
  if (!ticket) {
    const error = new Error('Ticket introuvable.');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (ticket.status !== 'REPLIED') {
    await addFlagsToMessage(ticket, ['\\Seen']);
  }

  const updated = await prisma.supportTicket.update({
    where: { id: normalizedId },
    data: {
      status: ticket.status === 'REPLIED' ? 'REPLIED' : 'READ',
    },
  });

  return serializeTicket(updated);
}

async function replyToAdminInboxTicket(prisma, transporter, payload) {
  const normalizedId = parseInteger(payload.ticketId, NaN, { min: 1 });
  if (!Number.isFinite(normalizedId)) {
    throw new Error('Identifiant de ticket invalide.');
  }

  const replyMessage = String(payload.replyMessage || '').trim();
  if (!replyMessage) {
    throw new Error('Le message de reponse est requis.');
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: normalizedId } });
  if (!ticket) {
    const error = new Error('Ticket introuvable.');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const customerEmail = String(payload.customerEmail || ticket.senderEmail || '').trim();
  const subject = String(payload.subject || ticket.subject || 'Sans sujet').trim() || 'Sans sujet';

  await transporter.sendMail({
    from: `"Support Bolo237" <${process.env.EMAIL_USER}>`,
    to: customerEmail,
    subject: `Re: ${subject}`,
    text: replyMessage,
    headers: ticket.messageId
      ? {
          'In-Reply-To': ticket.messageId,
          References: ticket.messageId,
        }
      : undefined,
  });

  let syncWarning = null;
  try {
    await addFlagsToMessage(ticket, ['\\Seen', '\\Answered']);
  } catch (error) {
    syncWarning = error instanceof Error ? error.message : 'Le statut IMAP n a pas pu etre mis a jour.';
    console.error('[admin-inbox] unable to set reply flags:', error);
  }

  const updated = await prisma.supportTicket.update({
    where: { id: normalizedId },
    data: { status: 'REPLIED' },
  });

  return {
    success: true,
    message: syncWarning
      ? `Reponse envoyee. Attention: ${syncWarning}`
      : 'Reponse envoyee.',
    item: serializeTicket(updated),
    warning: syncWarning,
  };
}

async function downloadAdminInboxAttachment(prisma, ticketId, part) {
  const normalizedId = parseInteger(ticketId, NaN, { min: 1 });
  if (!Number.isFinite(normalizedId)) {
    throw new Error('Identifiant de ticket invalide.');
  }

  const normalizedPart = String(part || '').trim();
  if (!/^\d+(\.\d+)*$/.test(normalizedPart)) {
    throw new Error('Partie de piece jointe invalide.');
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: normalizedId } });
  if (!ticket) {
    const error = new Error('Ticket introuvable.');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (!ticket.imapUid) {
    throw new Error('Ce ticket ne provient pas de la boite IMAP.');
  }

  const attachments = normalizeAttachmentsValue(ticket.attachments);
  const attachment = attachments.find((item) => item.part === normalizedPart);
  if (!attachment) {
    const error = new Error('Piece jointe introuvable.');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (attachment.size && attachment.size > DEFAULT_ATTACHMENT_DOWNLOAD_LIMIT) {
    const error = new Error('Cette piece jointe est trop volumineuse pour etre telechargee depuis le dashboard.');
    error.code = 'TOO_LARGE';
    throw error;
  }

  const config = getMailboxConfig();
  if (!config.enabled) {
    throw new Error('Configuration IMAP indisponible.');
  }

  const client = createImapClient(config);
  client.on('error', (error) => {
    console.error('[admin-inbox] IMAP attachment error:', error?.message || error);
  });

  await client.connect();
  let lock = null;

  try {
    lock = await client.getMailboxLock(ticket.mailboxPath || config.mailbox, {
      readOnly: true,
      description: 'admin-inbox-download-attachment',
    });

    const { meta, content } = await client.download(ticket.imapUid, normalizedPart, {
      uid: true,
      maxBytes: DEFAULT_ATTACHMENT_DOWNLOAD_LIMIT,
    });

    const chunks = [];
    for await (const chunk of content) {
      chunks.push(chunk);
    }

    return {
      attachment,
      meta,
      content: Buffer.concat(chunks),
    };
  } finally {
    if (lock) {
      lock.release();
    }

    if (client.usable) {
      await client.logout().catch(() => {
        client.close();
      });
    } else {
      client.close();
    }
  }
}

module.exports = {
  archiveAdminInboxTicket,
  downloadAdminInboxAttachment,
  getAdminInbox,
  getAdminInboxSummary,
  markAdminInboxTicketRead,
  replyToAdminInboxTicket,
  trashAdminInboxTicket,
};