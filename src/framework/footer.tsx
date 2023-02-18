import React from 'react';

interface FooterProps {
  localEnv: Object
}

let platform = navigator.platform;
// let userAgent = navigator.userAgent;

const Footer: React.FunctionComponent<FooterProps> = (props) => {
    let { localEnv } = props;
    return (
        <dl>
            <dt>前端类型：</dt>
            <dd>{platform}</dd>

            <dt>本地系统：</dt>
            <dd>{localEnv.localPlatform}</dd>

            <dt>应用路径：</dt>
            <dd>{localEnv.localPath}</dd>
        </dl>
    )
}

export default Footer;