import type { DatabaseSync } from 'node:sqlite';
import { Hono } from 'hono';
import {
  AttributionValidationError,
  getAnalyticsOverview,
  ingestTransaction,
  listTransactions
} from './attribution/service.js';
import {
  approveCampaign,
  createCampaign,
  getCampaign,
  GovernanceGateError,
  listCampaigns,
  markCampaignPublished,
  updateVariantCopy
} from './campaigns/service.js';
import { lintCampaignCopy } from './linter/engine.js';
import { dispatchExecutiveDigest } from './notifications/dispatcher.js';
import { buildOdooSyncPayload, exportOdooCsv } from './odoo/exporter.js';
import { calculateHonestSroi, SroiValidationError } from './sroi/calculator.js';
import type {
  ApprovalGateInput,
  CampaignBriefInput,
  LintInput,
  SroiInput,
  TransactionIngestInput
} from './types/domain.js';
import { renderDashboardHtml } from './ui/dashboard.js';

export function createApp(
  db: DatabaseSync,
  options: { port?: number | string } = {}
): Hono {
  const app = new Hono();
  const port = options.port ?? process.env.PORT ?? '8793';

  app.get('/', (c) => c.html(renderDashboardHtml(port)));

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      service: 'nazhir-reach',
      port: Number(port),
      principle: 'LA_YUFTI',
      standards: [
        'PSAK 412',
        'PSAK 109',
        'UU 41/2004',
        'UU 23/2011',
        'UU PDP 27/2022'
      ]
    })
  );

  app.post('/api/linter/check', async (c) => {
    const body = (await c.req.json()) as LintInput;
    const result = lintCampaignCopy(body);
    return c.json(result);
  });

  app.get('/api/campaigns', (c) => {
    const campaigns = listCampaigns(db);
    return c.json({ campaigns });
  });

  app.get('/api/campaigns/:id', (c) => {
    const campaign = getCampaign(db, c.req.param('id'));
    if (!campaign) {
      return c.json({ error: 'Kampanye tidak ditemukan.' }, 404);
    }
    return c.json({ campaign });
  });

  app.post('/api/campaigns', async (c) => {
    try {
      const body = (await c.req.json()) as CampaignBriefInput;
      const campaign = createCampaign(db, body);
      return c.json({ campaign }, 201);
    } catch (err) {
      if (err instanceof GovernanceGateError) {
        return c.json(
          { error: err.message, code: err.code },
          err.statusCode as 400 | 422
        );
      }
      throw err;
    }
  });

  app.patch('/api/campaigns/:id/variants/:variantId', async (c) => {
    try {
      const body = (await c.req.json()) as {
        copyText?: string;
        headline?: string;
        ctaLabel?: string;
      };
      const campaign = updateVariantCopy(
        db,
        c.req.param('id'),
        c.req.param('variantId'),
        body
      );
      return c.json({ campaign });
    } catch (err) {
      if (err instanceof GovernanceGateError) {
        return c.json(
          { error: err.message, code: err.code },
          err.statusCode as 404 | 422
        );
      }
      throw err;
    }
  });

  app.post('/api/campaigns/:id/approve', async (c) => {
    try {
      const body = (await c.req.json()) as ApprovalGateInput;
      const campaign = approveCampaign(db, c.req.param('id'), body);
      return c.json({ campaign });
    } catch (err) {
      if (err instanceof GovernanceGateError) {
        return c.json(
          { error: err.message, code: err.code },
          err.statusCode as 404 | 422
        );
      }
      throw err;
    }
  });

  app.post('/api/campaigns/:id/publish', async (c) => {
    try {
      let publishedAt: string | undefined;
      try {
        const body = (await c.req.json()) as { publishedAt?: string };
        publishedAt = body.publishedAt;
      } catch {
        publishedAt = undefined;
      }
      const campaign = markCampaignPublished(db, c.req.param('id'), publishedAt);
      return c.json({ campaign });
    } catch (err) {
      if (err instanceof GovernanceGateError) {
        return c.json(
          { error: err.message, code: err.code },
          err.statusCode as 404 | 422
        );
      }
      throw err;
    }
  });

  app.post('/api/webhooks/transactions', async (c) => {
    try {
      const body = (await c.req.json()) as TransactionIngestInput;
      const transaction = ingestTransaction(db, body);
      return c.json({ transaction }, 201);
    } catch (err) {
      if (err instanceof AttributionValidationError) {
        return c.json({ error: err.message }, err.statusCode as 400 | 422);
      }
      throw err;
    }
  });

  app.get('/api/analytics/overview', (c) => {
    const ref = c.req.query('referenceDate');
    const overview = getAnalyticsOverview(db, ref);
    return c.json(overview);
  });

  app.post('/api/sroi/calculate', async (c) => {
    try {
      const body = (await c.req.json()) as SroiInput;
      const result = calculateHonestSroi(body);
      return c.json(result);
    } catch (err) {
      if (err instanceof SroiValidationError) {
        return c.json({ error: err.message }, 400);
      }
      throw err;
    }
  });

  app.get('/api/export/odoo/json', (c) => {
    const transactions = listTransactions(db);
    const payload = buildOdooSyncPayload(transactions);
    return c.json(payload);
  });

  app.get('/api/export/odoo/csv', (c) => {
    const standardParam = c.req.query('standard');
    const standard = standardParam === 'psak109' ? 'psak109' : 'psak412';
    const transactions = listTransactions(db);
    const payload = buildOdooSyncPayload(transactions);
    const csv = exportOdooCsv(payload, standard);
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="nazhir-reach-${standard}.csv"`
      }
    });
  });

  app.post('/api/notifications/digest', async (c) => {
    let body: {
      channels?: Array<'waflare' | 'telegram'>;
      dryRun?: boolean;
      recipientLabel?: string;
    } = {};
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
    const overview = getAnalyticsOverview(db);
    const result = await dispatchExecutiveDigest(db, overview, body);
    return c.json(result);
  });

  return app;
}
