import "server-only";

export type AuditActionType =
  | "ADMIN_CREATED"
  | "USER_CREATED"
  | "ROLE_CHANGED";

export interface SecurityAuditEvent {
  action: AuditActionType;
  actorId: string;
  actorEmail?: string;
  targetUserId: string;
  targetUserEmail: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Records a structured security audit log for privileged team-management actions.
 * Guarantees:
 * - Server-only execution.
 * - Strict omission of passwords, hashes, and secrets.
 * - Standardized JSON structure for ingestion by monitoring and log aggregators.
 */
export function recordSecurityAudit(event: Omit<SecurityAuditEvent, "timestamp">): SecurityAuditEvent {
  // Sanitize details to ensure no password or secret fields are ever logged
  const sanitizedDetails = { ...event.details };
  delete sanitizedDetails.password;
  delete sanitizedDetails.passwordHash;
  delete sanitizedDetails.secret;
  delete sanitizedDetails.token;

  const fullEvent: SecurityAuditEvent = {
    ...event,
    details: sanitizedDetails,
    timestamp: new Date().toISOString(),
  };

  // Structured logging for production environments and audit pipelines
  console.info(`[SECURITY AUDIT] ${JSON.stringify(fullEvent)}`);

  return fullEvent;
}
