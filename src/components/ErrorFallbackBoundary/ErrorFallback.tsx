import React from 'react';
import { message } from 'antd';
import DefaultFallbackUI from './defaultFallbackUI';
import { IFallbackUI, IErrorFallbackProps } from '.';

interface ErrorFallbackProps {
    children: React.ReactNode;
    fallbackUI?: IFallbackUI;
    onReset?: () => void;
}

class ErrorFallback extends React.Component<ErrorFallbackProps> {

    state = {
        hasError: false,
        error: null,
        errorInfo: null,
    }

    constructor(props: ErrorFallbackProps) {
        super(props);
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('捕获组件级错误: ', error, errorInfo);
        this.setState({
            hasError: true,
            error: error,
            errorInfo: errorInfo,
        });
        message.error(error.message);
    }

    static getDerivedStateFromError(error: Error) {
        return {
            hasError: true,
        };
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
        this.props.onReset?.();
    }

    renderFallbackUI() {

        const props: IErrorFallbackProps = {
            error: this.state.error,
            errorInfo: this.state.errorInfo,
            onReset: this.handleReset,
            children: this.props.children,
        }

        return this.props.fallbackUI ? this.props.fallbackUI(props) : <DefaultFallbackUI {...props} />;
    }

    render() {
        if (this.state.hasError) {
            return this.renderFallbackUI();
        }

        return this.props.children;
    }
}

export default ErrorFallback;