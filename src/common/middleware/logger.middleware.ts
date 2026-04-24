import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  // no uso @req porque aun no he llegaod a nest js
  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `${method} ${originalUrl} ${res.statusCode} - ${durationMs}ms`,
      );
    });

    next();
  }
}
