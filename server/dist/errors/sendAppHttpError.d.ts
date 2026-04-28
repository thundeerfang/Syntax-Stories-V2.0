import type { Response } from 'express';
import { AppHttpError } from './httpErrors.js';
/** Same JSON/headers as `errorHandler` for `AppHttpError` — use when a controller catches and must respond inline (Express 4 async). */
export declare function sendAppHttpError(res: Response, err: AppHttpError): void;
//# sourceMappingURL=sendAppHttpError.d.ts.map