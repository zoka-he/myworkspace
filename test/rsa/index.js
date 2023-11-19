const NodeRSA = require('node-rsa');

let cipher = new NodeRSA({ b: 2048 });

console.debug(cipher.exportKey('private'));
console.debug(cipher.exportKey('public'));