import privateKey from './prv.pem';
import NodeRSA from 'node-rsa';

const cipher = new NodeRSA(
    privateKey, 
    'pkcs1-private-pem',
    {
        encryptionScheme: 'pkcs1'
    }
);

export default function(loginInfo: string) {
    console.debug('login info -->>', loginInfo);
    return cipher.decrypt(loginInfo, 'utf8');
}