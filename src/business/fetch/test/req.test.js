const convert = require('xml-js');
const util = require('util');

const parse = convert.xml2json;
const stringify = convert.json2xml;




const respBody = `<?xml version='1.0' encoding='UTF-8'?>
<TX>
    <TX_HEADER>
        <SYS_HDR_LEN>1</SYS_HDR_LEN>
        <SYS_PKG_VRSN>01</SYS_PKG_VRSN>
        <SYS_TTL_LEN>1</SYS_TTL_LEN>
        <SYS_REQ_SEC_ID>101020</SYS_REQ_SEC_ID>
        <SYS_SND_SEC_ID>101020</SYS_SND_SEC_ID>
        <SYS_TX_TYPE>000000</SYS_TX_TYPE>
<SYS_TX_CODE><![CDATA[NSDS0016]]></SYS_TX_CODE>
        <SYS_EVT_TRACE_ID>1010203011551077093000030</SYS_EVT_TRACE_ID>
        <SYS_SND_SERIAL_NO>0000000000</SYS_SND_SERIAL_NO>
        <SYS_PKG_TYPE>1</SYS_PKG_TYPE>
        <SYS_MSG_LEN>10</SYS_MSG_LEN>
        <SYS_IS_ENCRYPTED>0</SYS_IS_ENCRYPTED>
        <SYS_ENCRYPT_TYPE>3</SYS_ENCRYPT_TYPE>
        <SYS_COMPRESS_TYPE>0</SYS_COMPRESS_TYPE>
        <SYS_EMB_MSG_LEN>10</SYS_EMB_MSG_LEN>
        <SYS_RECV_TIME>20220523140236236</SYS_RECV_TIME>
        <SYS_RESP_TIME>20220523140236236</SYS_RESP_TIME>
        <SYS_PKG_STS_TYPE>00</SYS_PKG_STS_TYPE>
        <SYS_TX_STATUS>00</SYS_TX_STATUS>
        <SYS_RESP_CODE>000000000000</SYS_RESP_CODE>
        <SYS_RESP_DESC_LEN/>
        <RESP_DESC>success</RESP_DESC>
    </TX_HEADER>
    <TX_BODY>
        <COMMON/>
        <ENTITY>
            <base64_Ecrp_Txn_Inf>
                <![CDATA[aaaaaaaaaaa]]>
            </base64_Ecrp_Txn_Inf>
            <Rslt_Ret_Inf/>
            <Ext_Stm_Safe_ModDsc>
                <![CDATA[low]]>
            </Ext_Stm_Safe_ModDsc>
            < Smlr_Dgr_Cmnt >
                <![CDATA[0]]>
            </Smlr_Dgr_Cmnt>
            < Ret_Trgt_Cd>
                <![CDATA[jhshhym_1]]>
            </Ret_Trgt_Cd>
        </ENTITY>
    </TX_BODY>
    <TX_EMB/>
</TX>
`;

const reqBody = `<?xml version="1.0" encoding="utf-8"?>

<TX>
  <TX_HEADER>
    <SYS_HDR_LEN><![CDATA[1]]></SYS_HDR_LEN>
    <SYS_PKG_VRSN><![CDATA[01]]></SYS_PKG_VRSN>
    <SYS_TTL_LEN><![CDATA[1]]></SYS_TTL_LEN>
    <SYS_REQ_SEC_ID><![CDATA[101020]]></SYS_REQ_SEC_ID>
    <SYS_SND_SEC_ID><![CDATA[101020]]></SYS_SND_SEC_ID>
    <SYS_TX_CODE><![CDATA[NSDS0016]]></SYS_TX_CODE>
    <SYS_TX_VRSN><![CDATA[1]]></SYS_TX_VRSN>
    <SYS_TX_TYPE><![CDATA[000000]]></SYS_TX_TYPE>
    <SYS_RESERVED><![CDATA[0]]></SYS_RESERVED>
    <SYS_EVT_TRACE_ID><![CDATA[1010203011551077093000030]]></SYS_EVT_TRACE_ID>
    <SYS_SND_SERIAL_NO><![CDATA[0000000000]]></SYS_SND_SERIAL_NO>
    <SYS_PKG_TYPE><![CDATA[1]]></SYS_PKG_TYPE>
    <SYS_MSG_LEN><![CDATA[10]]></SYS_MSG_LEN>
    <SYS_IS_ENCRYPTED><![CDATA[0]]></SYS_IS_ENCRYPTED>
    <SYS_ENCRYPT_TYPE><![CDATA[3]]></SYS_ENCRYPT_TYPE>
    <SYS_COMPRESS_TYPE><![CDATA[0]]></SYS_COMPRESS_TYPE>
    <SYS_EMB_MSG_LEN><![CDATA[10]]></SYS_EMB_MSG_LEN>
    <SYS_REQ_TIME><![CDATA[20190225144453]]></SYS_REQ_TIME>
    <SYS_PKG_STS_TYPE><![CDATA[00]]></SYS_PKG_STS_TYPE>
  </TX_HEADER>
  <TX_BODY>
    <COMMON>
    </COMMON>
    <ENTITY>
      <base64_ECD_Txn_Inf><![CDATA[-----------]]></base64_ECD_Txn_Inf>
    </ENTITY>
  </TX_BODY>
  <TX_EMB/>
</TX>
`;

let jsonData = parse(reqBody);
// console.log(jsonData);
console.log(util.inspect(jsonData, {depth: null}));