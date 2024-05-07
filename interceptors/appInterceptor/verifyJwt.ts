import jwtSecretKey from '@/src/utils/appAuth/jwt.pem';
import { jwtVerify, type JWTPayload } from 'jose';

interface IVerifyResult {
    success: boolean
    message: string
    username?: string
    id?: string
}

export default async function verifyJwt(jwt: string): Promise<IVerifyResult> {
    let { payload } = await jwtVerify(jwt, new TextEncoder().encode(jwtSecretKey));
    if (!payload) {
        return {
            success: false,
            message: 'invalid token(2)'
        }
    } else {
        console.debug(`---->> user ${payload} access from app`);
        return {
            success: true,
            message: 'ok',
            ...payload
        }
    }
}