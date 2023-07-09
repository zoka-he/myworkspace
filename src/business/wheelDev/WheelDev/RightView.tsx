interface IRimProps {
    rimRadius: number,
    rimHeight: number
}

function RimView(props: IRimProps) {

    let borderStyle = {
        stroke: 'black',
        strokeWidth: 1,
        strokeOpacity: 1,
        fill: 'none'
    }

    function checkProps() {
        if (typeof props.rimRadius !== "number" || props.rimRadius === 0) {
            return false;
        }

        if (typeof props.rimHeight !== "number" || props.rimHeight === 0) {
            return false;
        }

        if (props.rimRadius <= props.rimHeight) {
            return false;
        }

        return true;
    }

    if (!checkProps()) {
        return null;
    }

    let outRaduis = 80;
    let inRadius = (props.rimRadius - props.rimHeight) / props.rimRadius * outRaduis;

    function renderOutline() {
        return <circle cx={100} cy={100} r={outRaduis} style={borderStyle}></circle>
    }

    function renderInline() {
        return <circle cx={100} cy={100} r={inRadius} style={borderStyle}></circle>
    }

    return [
        renderOutline(),
        renderInline()
    ]
}

function HubView() {

}

interface IViewProps {
    size?: number | number[],
    rimProps: IRimProps
}

export default function RightView(props: IViewProps) {
    let size = props.size || [300, 300];
    if (typeof size === 'number') {
        size = [size, size];
    }

    try {
        return (
            <div style={{ width: size[0], height: size[1] }}>
                <svg className={'f-fit-content'} viewBox={'0 0 200 200'}>
                    <RimView {...props.rimProps}/>
                </svg>
            </div>
        )
    } catch (e) {
        return <div>{e.message}</div>
    }

}