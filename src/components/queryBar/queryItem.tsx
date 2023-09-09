import React, { ReactElement } from "react";
import ParamsContext from "./paramsContext";

interface IQueryItemProps {
    name: string
    label: string
    colon?: boolean
    children: ReactElement | ReactElement[]
}

export default function(props: IQueryItemProps) {
    let { name, label, colon, children } = props;

    if (typeof colon !== 'boolean') {
        colon = true;
    }

    let userComp: any = null;
    if (children instanceof Array && children.length) {
        userComp = children[0] || null;
    } else if (children) {
        userComp = children;
    }

    function renderUserComp(contextValue: any) {
        if (userComp) {
            console.debug('userComp', userComp);

            const proxyInputAction = function(value: any) {
                contextValue.setParams({
                    ...contextValue.params,
                    [name]: value
                })
            }

            let inputMethod = 'onChange';
            let inputHandler = (e: InputEvent) => {
                proxyInputAction((e.target as HTMLInputElement).value);
            }

            userComp = React.cloneElement(
                userComp,
                {
                    value: contextValue.params[name],
                    [inputMethod]: inputHandler,
                    // disabled: contextValue.spinning
                }
            );
        }

        return userComp;
    }
    

    let labelText = label + (colon ? '：' : null);

    return (
        <ParamsContext.Consumer>
        { value => {
            return (
                <>
                    <label>{labelText}</label>
                    {renderUserComp(value)}
                </>
            )
        } }
        </ParamsContext.Consumer>
    )
}