import { IErrorFallbackProps } from '.';

export default function DefaultFallbackUI(props: IErrorFallbackProps) {

    return (
        <div>
            <h1>Error: {props.error?.message}</h1>
            <p>Error Info: {props.errorInfo?.componentStack}</p>
            <button onClick={props.onReset}>Reset</button>
        </div>
    );
}