import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function viewerAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-view-token'] as string | undefined;

  if (!config.viewToken || config.viewToken.length < 16) {
    res.status(503).json({ code: 'VIEWER_DISABLED', message: 'View-only access is not configured on this server.' });
    return;
  }

  if (!token || token !== config.viewToken) {
    res.status(401).json({ code: 'INVALID_VIEW_TOKEN', message: 'Invalid or missing view token.' });
    return;
  }

  next();
}
