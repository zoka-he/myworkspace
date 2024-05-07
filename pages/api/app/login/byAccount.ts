import { NextApiRequest, NextApiResponse } from 'next';
import jwtSecretKey from '@/src/utils/appAuth/jwt.pem';
import LoginAccountService from '@/src/services/user/loginAccountService';
import { SignJWT } from 'jose';

const loginAccountService = new LoginAccountService();

function createJWT(payload: Object, expire_s: number) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expire_s;

    return new SignJWT({...payload})
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setExpirationTime(exp)
        .setIssuedAt(iat)
        .setNotBefore(iat)
        .sign(new TextEncoder().encode(jwtSecretKey));
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { body } = req;

    const user = await loginAccountService.verifyUser(body || '', 'rsa');
    if (user) {
        const jwtPayload = {
            id: '' + user.ID,
            username: user.username,
        }

        // 创建jwt
        const jwtToken = await createJWT(jwtPayload, 30 * 24 * 60 * 60);
        console.debug(jwtToken);

        res.status(200).json({ 
            message: 'ok', 
            token: jwtToken
        });
    } else {
        res.status(401).json({
            message: 'invalid username or password!'
        })
    }
}