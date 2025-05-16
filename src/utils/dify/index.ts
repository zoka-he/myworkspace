import DifyApi from "./dify_api";

let difyCfg = {
    apiKey: 'dataset-CND54hW0XBgB1UTOA5ZB9xjr',
    serverUrl: 'http://localhost/v1'
};

if (process.env.NODE_ENV === 'production') {
    difyCfg.serverUrl = 'http://host.docker.internal/v1'
};

const difyApi = new DifyApi(
    difyCfg.apiKey,
    difyCfg.serverUrl
)

export default difyApi;

export { difyCfg };
