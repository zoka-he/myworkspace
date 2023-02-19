import config from '../../config/kibana';
import CryptoJS from 'crypto-js';

function getHeaders() {
  let tokenSrc = `${config.userName}:${config.password}`;
  let tokenB64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(tokenSrc));
  return {
    Authorization: 'Basic ' + tokenB64
  };
}

export default {
  getHeaders
}