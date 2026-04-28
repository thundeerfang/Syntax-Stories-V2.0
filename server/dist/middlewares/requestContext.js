import { randomUUID } from 'node:crypto';
/**
 * Propagates `X-Request-Id` (client or generated) for log correlation.
 */
export function requestContextMiddleware(req, res, next) {
    const incoming = req.get('x-request-id')?.trim();
    const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
}
//# sourceMappingURL=requestContext.js.map