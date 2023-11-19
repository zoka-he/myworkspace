import LoginAccountService from "@/src/services/user/loginAccountService";

interface IVerifyResult {
    success: boolean
    message: string
}

function isValidJwt(jwt: string) {
    return false;
}

function getJwtPayload(jwt: string) {
    return {
        username: '',
        UID: -1
    };
}

function isValidLoginAccount(jwtPayload: any) {
    return false;
}

export default async function verifyJwt(jwt: string): Promise<IVerifyResult> {
    if (!isValidJwt(jwt)) {
        return {
            success: false,
            message: 'invalid token(1)'
        };
    }

    let payload = getJwtPayload(jwt);

    if (!isValidLoginAccount(payload)) {
        return {
            success: false,
            message: 'invalid token(2)'
        }
    } else {
        return {
            success: true,
            message: 'ok'
        }
    }
}