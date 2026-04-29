import jwt from 'jsonwebtoken';
import { authConfig } from './auth.config.js';
export function signAccessToken(payload, expiresIn) {
    const key = authConfig.JWT_ACCESS_PRIVATE_KEY;
    const expires = expiresIn ?? authConfig.ACCESS_TOKEN_EXPIRY;
    const opts = { algorithm: authConfig.JWT_ALGORITHM, expiresIn: expires };
    if (key) {
        return jwt.sign(payload, key, opts);
    }
    return jwt.sign(payload, (process.env.JWT_SECRET ?? 'secret'), opts);
}
//# sourceMappingURL=jwt.js.map