import { Result } from "antd";

interface IRimProps {
    rimRadius: number,
    rimHeight: number,
    tyreWidth: number
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

        if (typeof props.tyreWidth !== "number" || props.tyreWidth === 0) {
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

    let outRaduis = 120;
    let inRadius = (props.rimRadius - props.rimHeight) / props.rimRadius * outRaduis;
    let tyreSlot_dx = props.tyreWidth / props.rimRadius * outRaduis / 2;
    let tyreSlot_dy = 16 / props.rimRadius * outRaduis / 2; // 刹车边宽度一般是13

    let topPath = [
        `M ${50 - tyreSlot_dx} ${150 - outRaduis}`,
        `L ${50 - tyreSlot_dx} ${150 - outRaduis + tyreSlot_dy}`,
        `L ${50 + tyreSlot_dx} ${150 - outRaduis + tyreSlot_dy}`,
        `L ${50 + tyreSlot_dx} ${150 - outRaduis}`,
        `M ${50 - tyreSlot_dx} ${150 - outRaduis + tyreSlot_dy}`,
        `Q ${50 - tyreSlot_dx} ${150 - inRadius} ${50} ${150 - inRadius}`,
        `Q ${50 + tyreSlot_dx} ${150 - inRadius} ${50 + tyreSlot_dx} ${150 - outRaduis + tyreSlot_dy}`,
    ].join(' ');

    let bottomPath = [
        `M ${50 - tyreSlot_dx} ${150 + outRaduis}`,
        `L ${50 - tyreSlot_dx} ${150 + outRaduis - tyreSlot_dy}`,
        `L ${50 + tyreSlot_dx} ${150 + outRaduis - tyreSlot_dy}`,
        `L ${50 + tyreSlot_dx} ${150 + outRaduis}`,
        `M ${50 - tyreSlot_dx} ${150 + outRaduis - tyreSlot_dy}`,
        `Q ${50 - tyreSlot_dx} ${150 + inRadius} ${50} ${150 + inRadius}`,
        `Q ${50 + tyreSlot_dx} ${150 + inRadius} ${50 + tyreSlot_dx} ${150 + outRaduis - tyreSlot_dy}`,
    ].join(' ');

    function renderOutline() {
        return (
            <>
                <path d={topPath} style={borderStyle}></path>
                <path d={bottomPath} style={borderStyle}></path>
            </>
        )
    }

    // function renderInline() {
    //     return <circle cx={100} cy={100} r={inRadius} style={borderStyle}></circle>
    // }

    return (
        <>
            { renderOutline() }
            {/* { renderInline() } */}
        </>
    )
}

interface IHubProps {
    hubLength: number,
    coreRadius: number,
    flange1Radius: number,
    flange1Pos: number,
    flange1Deg: number,
    flange2Radius: number,
    flange2Pos: number,
    flange2Deg: number,
    flange3Radius: number,
    flange3Pos: number,
    flange3Deg: number,
    flange4Radius: number,
    flange4Pos: number,
    flange4Deg: number,
    holeRadius: number,
    holeCount: number,
}


interface IViewProps {
    size?: number | number[],
    rimProps: IRimProps,
    hubProps: IHubProps
}

function getCoreRef(rimProps: IRimProps, hubProps: IHubProps) {
    let core_dx = hubProps.hubLength / rimProps.rimRadius * 120 / 2;
    let core_dy = hubProps.coreRadius / rimProps.rimRadius * 120 / 2;
    return [core_dx, core_dy];
}

function getFlangeRef(rimRadius: number, coreDx: number, flangePos: number, flangeRadius: number) {
    let flange_dx = flangePos / rimRadius * 120;
    let flange_dy = flangeRadius / rimRadius * 120;

    return [ 
        coreDx - flange_dx,
        flange_dy
    ]
}

function HubView(props: IViewProps) {

    let { rimProps, hubProps } = props;

    let borderStyle = {
        stroke: 'black',
        strokeWidth: 1,
        strokeOpacity: 1,
        fill: 'none'
    }

    let [core_dx, core_dy] = getCoreRef(rimProps, hubProps);
    let core = <rect x={50 - core_dx} y={150 - core_dy} width={2 * core_dx} height={ 2 * core_dy} style={borderStyle}></rect>

    let flange1Ref = getFlangeRef(rimProps.rimRadius, core_dx, hubProps.flange1Pos, hubProps.flange1Radius);
    let flange2Ref = getFlangeRef(rimProps.rimRadius, core_dx, hubProps.flange2Pos, hubProps.flange2Radius);
    let flange3Ref = getFlangeRef(rimProps.rimRadius, core_dx, hubProps.flange3Pos, hubProps.flange3Radius);
    let flange4Ref = getFlangeRef(rimProps.rimRadius, core_dx, hubProps.flange4Pos, hubProps.flange4Radius);

    let leftFlangePath = [
        `M ${50 - flange1Ref[0]} ${150 - flange1Ref[1]}`,
        `L ${50 - flange2Ref[0]} ${150 - flange2Ref[1]}`,
        `L ${50 - flange2Ref[0]} ${150 + flange2Ref[1]}`,
        `L ${50 - flange1Ref[0]} ${150 + flange1Ref[1]}`,
        `L ${50 - flange1Ref[0]} ${150 - flange1Ref[1]}`,
    ].join(' ');
    let leftFlange = <path d={leftFlangePath} style={borderStyle}></path>

    let rightFlangePath = [
        `M ${50 + flange3Ref[0]} ${150 - flange3Ref[1]}`,
        `L ${50 + flange4Ref[0]} ${150 - flange4Ref[1]}`,
        `L ${50 + flange4Ref[0]} ${150 + flange4Ref[1]}`,
        `L ${50 + flange3Ref[0]} ${150 + flange3Ref[1]}`,
        `L ${50 + flange3Ref[0]} ${150 - flange3Ref[1]}`,
    ].join(' ');
    let rightFlange = <path d={rightFlangePath} style={borderStyle}></path>

    return (
        <>
            {core}
            {leftFlange}
            {rightFlange}
        </>
    );
}

function SpokeView(props: IViewProps) {

    let { rimProps, hubProps } = props;

    let borderStyle = {
        stroke: 'black',
        strokeWidth: 1,
        strokeOpacity: 1,
        fill: 'none'
    }

    let [core_dx, core_dy] = getCoreRef(rimProps, hubProps);
    let core = <rect x={50 - core_dx} y={150 - core_dy} width={2 * core_dx} height={ 2 * core_dy} style={borderStyle}></rect>

    let flange1Ref = getFlangeRef(rimProps.rimRadius, core_dx, hubProps.flange1Pos, hubProps.flange1Radius);
    let flange2Ref = getFlangeRef(rimProps.rimRadius, core_dx, hubProps.flange2Pos, hubProps.flange2Radius);
    let flange3Ref = getFlangeRef(rimProps.rimRadius, core_dx, hubProps.flange3Pos, hubProps.flange3Radius);
    let flange4Ref = getFlangeRef(rimProps.rimRadius, core_dx, hubProps.flange4Pos, hubProps.flange4Radius);

    let rim_dy = (rimProps.rimRadius - rimProps.rimHeight) / rimProps.rimRadius * 120;

    let spokes = [
        <line x1={50 - flange1Ref[0]} y1={150 - flange1Ref[1]} x2={50} y2={150 - rim_dy} style={borderStyle}/>,
        <line x1={50 - flange1Ref[0]} y1={150 + flange1Ref[1]} x2={50} y2={150 + rim_dy} style={borderStyle}/>,
        <line x1={50 - flange2Ref[0]} y1={150 - flange2Ref[1]} x2={50} y2={150 - rim_dy} style={borderStyle}/>,
        <line x1={50 - flange2Ref[0]} y1={150 + flange2Ref[1]} x2={50} y2={150 + rim_dy} style={borderStyle}/>,
        <line x1={50 + flange3Ref[0]} y1={150 - flange3Ref[1]} x2={50} y2={150 - rim_dy} style={borderStyle}/>,
        <line x1={50 + flange3Ref[0]} y1={150 + flange3Ref[1]} x2={50} y2={150 + rim_dy} style={borderStyle}/>,
        <line x1={50 + flange4Ref[0]} y1={150 - flange4Ref[1]} x2={50} y2={150 - rim_dy} style={borderStyle}/>,
        <line x1={50 + flange4Ref[0]} y1={150 + flange4Ref[1]} x2={50} y2={150 + rim_dy} style={borderStyle}/>,
    ];

    return (
        <>{ spokes }</>
    );
}

export default function BackView(props: IViewProps) {
    let size = props.size || [100, 300];
    if (typeof size === 'number') {
        size = [size / 3, size];
    }

    if (!props.hubProps || !props.rimProps) {
        return (
            <div style={{ width: size[0], height: size[1] }}>
                <Result
                    status="error"
                    title="参数错误"
                    subTitle="该参数不能计算轮组尺寸，请更改别的参数"
                />
            </div>
        );
    }

    return (
        <div style={{ width: size[0], height: size[1] }}>
            <svg className="f-fit-content" viewBox="0 0 100 300">
                <RimView {...props.rimProps}/>
                <HubView {...props}/>
                <SpokeView {...props}/>
            </svg>
        </div>
    )
}