// lib/logging.ts
import crypto from 'crypto';

export class PrivacyLogger {
  private static PII_PATTERNS = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{3}-\d{3}-\d{4}\b/, // Phone
    /\b(?:patient|mr|mrs|dr)[\s]+[a-z]+\b/i // Names with titles
  ];

  static hashUserId(userId: string): string {
    return crypto.createHash('sha256').update(userId).digest('hex').substring(0, 16);
  }

  static scrubPII(text: string): string {
    let scrubbed = text;
    
    // Replace email addresses
    scrubbed = scrubbed.replace(this.PII_PATTERNS[1], '[EMAIL]');
    
    // Replace SSNs
    scrubbed = scrubbed.replace(this.PII_PATTERNS[0], '[SSN]');
    
    // Replace phone numbers
    scrubbed = scrubbed.replace(this.PII_PATTERNS[2], '[PHONE]');
    
    // Replace names with titles
    scrubbed = scrubbed.replace(this.PII_PATTERNS[3], '[NAME]');
    
    return scrubbed;
  }

  static sanitizeLogData(data: any): any {
    if (!data) return {};

    const sanitized: any = {
      timestamp: new Date().toISOString()
    };

    if (data.userId) {
      sanitized.hashedUserId = this.hashUserId(data.userId);
    }

    if (data.workspaceId) {
      sanitized.workspaceId = data.workspaceId;
    }

    if (data.route) {
      sanitized.route = data.route;
    }

    if (data.method) {
      sanitized.method = data.method;
    }

    if (data.statusCode) {
      sanitized.statusCode = data.statusCode;
    }

    if (data.latency) {
      sanitized.latency = data.latency;
    }

    if (data.errorCode) {
      sanitized.errorCode = data.errorCode;
    }

    if (data.ip) {
      sanitized.ipHash = crypto.createHash('md5').update(data.ip).digest('hex').substring(0, 8);
    }

    if (data.userAgent) {
      sanitized.userAgentHash = crypto.createHash('md5').update(data.userAgent).digest('hex').substring(0, 8);
    }

    return sanitized;
  }

  static info(message: string, data?: any) {
    const sanitized = this.sanitizeLogData(data);
    console.log(`[INFO] ${message}`, sanitized);
  }

  static error(message: string, error?: Error, data?: any) {
    const sanitized = this.sanitizeLogData(data);
    console.error(`[ERROR] ${message}`, {
      ...sanitized,
      error: {
        message: error?.message,
        name: error?.name,
        // Don't log full stack trace in production
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      }
    });
  }

  static warn(message: string, data?: any) {
    const sanitized = this.sanitizeLogData(data);
    console.warn(`[WARN] ${message}`, sanitized);
  }

  static privacyBudget(payload: any): boolean {
    const payloadStr = JSON.stringify(payload).toLowerCase();
    const piiCount = this.PII_PATTERNS.reduce((count, pattern) => 
      count + (payloadStr.match(pattern) || []).length, 0);

    return piiCount <= 2; // Allow max 2 PII patterns per log
  }

  // Request logging helper
  static logRequest(req: Request, startTime: number, statusCode: number, error?: Error) {
    const latency = Date.now() - startTime;
    
    const logData = {
      method: req.method,
      route: new URL(req.url).pathname,
      statusCode,
      latency,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent'),
      errorCode: error?.name
    };

    if (error) {
      this.error('Request failed', error, logData);
    } else {
      this.info('Request completed', logData);
    }
  }
}
