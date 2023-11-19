import privateKey from './prv.pem';
import NodeRSA from 'node-rsa';

const cipher = new NodeRSA();
cipher.importKey(privateKey, 'pkcs1-private-pem');

export default function(loginInfo: string) {
    return cipher.decrypt(loginInfo, 'utf8');
}