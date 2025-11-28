import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { logger } from 'hono/logger';

import { auth } from './lib/auth';
import { ticker } from './routes/ticker.routes';

const app = new Hono();

const router = app
  .use(logger())
  .use('/*', serveStatic({ root: './client/dist' }))
  .on(['POST', 'GET'], '/api/auth/**', (c) => auth.handler(c.req.raw))
  .route('/api/trading/ticker', ticker);

export type AppType = typeof router;
export default app;
