import { Request, Response, NextFunction } from 'express';

export function requireDashboardAuth(req: Request, res: Response, next: NextFunction): void {
  const token = process.env.DASHBOARD_TOKEN;
  if (!token) {
    // No token configured — open access (dev mode)
    next();
    return;
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const provided = authHeader.slice(7);
  if (provided !== token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
