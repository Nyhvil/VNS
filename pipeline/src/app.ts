import * as fs from 'fs';
import * as path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { router } from './http/router';
import { createWebRouter, WebDeps } from './web/web-router';

export interface AppOptions {
  /**
   * Set to make this server the whole web site: the web app's backend
   * (/functions/v1/*) and, when `distDir` holds a build, the web app itself.
   */
  web?: {
    deps: WebDeps;
    /** Folder with the built web app, or null to serve the backend only. */
    distDir: string | null;
  };
}

/** Addresses that belong to the APIs and must never fall back to index.html. */
const API_PREFIXES = ['/pipeline/', '/functions/', '/uploads/'];

export function createApp(options: AppOptions = {}): express.Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // The UI library sets inline styles on its components.
          styleSrc: ["'self'", "'unsafe-inline'"],
          // data: and blob: are the preview of an image the visitor picked.
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
        },
      },
    })
  );
  app.use(cors({ origin: false })); // Same-origin only
  // Screenshots arrive as base64, which is about a third larger than the file.
  app.use(express.json({ limit: '15mb' }));

  app.use(router);

  if (options.web) {
    app.use(createWebRouter(options.web.deps));

    const distDir = options.web.distDir;
    if (distDir && fs.existsSync(path.join(distDir, 'index.html'))) {
      mountWebApp(app, distDir);
    }
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // A body that is not JSON, or is too large, ends up here.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (error as { status?: number; statusCode?: number } | null)?.status ??
      (error as { statusCode?: number } | null)?.statusCode;

    if (status === 413) {
      res.status(413).json({ error: 'Nội dung gửi lên quá lớn.' });
      return;
    }
    if (typeof status === 'number' && status >= 400 && status < 500) {
      res.status(status).json({ error: 'Yêu cầu không hợp lệ.' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

function mountWebApp(app: express.Express, distDir: string): void {
  const assetsDir = path.join(distDir, 'assets') + path.sep;

  app.use(
    express.static(distDir, {
      index: false,
      setHeaders: (res, filePath) => {
        // Files under assets/ carry a hash of their content in their name.
        if (filePath.startsWith(assetsDir)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  // The web app does its own routing (/admin, ...): every page is index.html.
  app.get('*', (req, res, next) => {
    if (API_PREFIXES.some(prefix => req.path.startsWith(prefix))) return next();
    if (path.extname(req.path)) return next(); // a file that does not exist
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}
