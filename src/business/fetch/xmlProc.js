import convert from 'xml-js';


function parse(xmlString) {
  return convert.xml2json(xmlString);
}

function stringify(jsonString) {
  return convert.json2xml(jsonString);
}


export default {
  parse,
  stringify
}
