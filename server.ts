import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import authRoutes from './server/routes/auth.routes';
import onboardingRoutes from './server/routes/onboarding.routes';
import userRoutes from './server/routes/user.routes';
import workspaceRoutes from './server/routes/workspace.routes';
import invitationRoutes from './server/routes/invitation.routes';
import scanRoutes from './server/routes/scan.routes';
import billingRoutes from './server/routes/billing.routes';
import { ScanPipelineService } from './server/services/scanPipeline.service';

// Ensure .env and .env.local are loaded if present in workspace
dotenv.config();
if (fs.existsSync(path.resolve(process.cwd(), '.env.local'))) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Run pipeline recovery for any interrupted non-terminal scans
  ScanPipelineService.recoverStuckScans();

  // Configure Production CORS
  const configuredFrontend = (process.env.FRONTEND_URL || process.env.APP_URL || process.env.VITE_APP_URL || '').trim().replace(/\/+$/, '');

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.trim().replace(/\/+$/, '');
      if (configuredFrontend) {
        if (cleanOrigin === configuredFrontend || cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1')) {
          return callback(null, true);
        }
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-workspace-id',
      'x-organization-id',
      'x-demo-user',
      'x-requested-with',
      'Accept',
    ],
  }));

  // Basic middleware with rawBody capture for webhook signature verification
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // API Routes FIRST
  app.use('/api/auth', authRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/invitations', invitationRoutes);
  app.use('/api/scans', scanRoutes);
  app.use('/api/billing', billingRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'PreScan Core API',
      timestamp: new Date().toISOString(),
    });
  });

  // Handle unhandled /api/* requests with a clean JSON 404 response
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    });
  });

  // Global API error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[PreScan Express Error]', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'An unexpected internal server error occurred.',
      code: err.code || 'INTERNAL_SERVER_ERROR',
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PreScan Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PreScan server:', err);
  process.exit(1);
});
