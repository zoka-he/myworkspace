import NodeCache from "node-cache";

const cached = new NodeCache({ stdTTL: 100, checkperiod: 120 });
console.debug('................ new NodeCache ................')

export default cached;

