import ErrorFallback from './ErrorFallback';
export default ErrorFallback;

export interface IErrorFallbackProps {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    onReset?: () => void;
    children: React.ReactNode;
}

export interface IFallbackUI {
    (
        props: IErrorFallbackProps,
    ): React.ReactNode;
}