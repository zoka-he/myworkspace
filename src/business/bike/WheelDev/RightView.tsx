import { Result } from "antd";

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

    return (
        <>
            { renderOutline() }
            { renderInline() }
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


function getFlangeRef(rimRadius: number, flangeRadius: number) {
    return flangeRadius / rimRadius * 80;
}

interface IViewProps {
    size?: number | number[],
    rimProps: IRimProps,
    hubProps: IHubProps
}

function HubView(props: IViewProps) {

    let { rimProps, hubProps } = props;
    let { rimRadius } = rimProps;

    let borderStyle = {
        stroke: 'black',
        strokeWidth: 1,
        strokeOpacity: 1,
        fill: 'none'
    }

    let coreDr = getFlangeRef(rimRadius, hubProps.coreRadius);
    let flange1dr = getFlangeRef(rimRadius, hubProps.flange1Radius);
    let flange2dr = getFlangeRef(rimRadius, hubProps.flange2Radius);
    let flange3dr = getFlangeRef(rimRadius, hubProps.flange3Radius);
    let flange4dr = getFlangeRef(rimRadius, hubProps.flange4Radius);

    return (
        <>
            <circle cx={100} cy={100} r={coreDr} style={borderStyle}/>
            <circle cx={100} cy={100} r={flange1dr} style={borderStyle}/>
            <circle cx={100} cy={100} r={flange2dr} style={borderStyle}/>
            <circle cx={100} cy={100} r={flange3dr} style={borderStyle}/>
            <circle cx={100} cy={100} r={flange4dr} style={borderStyle}/>
        </>
    );
}

function SpokeView(props: IViewProps) {

    let { rimProps, hubProps } = props;

    const modeDef: { [key: string]: number[] } = {
        '3X': [-6, 6, 6, -6],
        '0X': [0, 0, 0, 0]
    }

    let mode = '3X';

    let borderStyle = {
        stroke: 'black',
        strokeWidth: 1,
        strokeOpacity: 1,
        fill: 'none'
    }

    const getSpokeRef = (flangeDr: number, startDeg: number, rimDr: number, endDeg: number) => {
        // console.debug('getSpokeRef', flangeDr, startDeg, rimDr, endDeg);
        let cx = 100, cy = 100;
        let x1 = Math.sin(startDeg / 180 * Math.PI) * flangeDr + cx;
        let x2 = Math.sin(endDeg / 180 * Math.PI) * rimDr + cx;
        let y1 = Math.cos(startDeg / 180 * Math.PI) * flangeDr + cy;
        let y2 = Math.cos(endDeg / 180 * Math.PI) * rimDr + cy;

        return [x1, y1, x2, y2];
    }

    const drawGrp = (
        flangeDr: number, 
        flangeDeg: number, 
        rimDr: number, 
        flangHoleIndex: number, 
        rimHoleIndex: number
    ) => {
        console.debug('drawGrp', flangeDeg, flangHoleIndex, rimHoleIndex);
        
        let grpSize = modeDef[mode].length;
        let maxRepeat = hubProps.holeCount / grpSize;
        let spokeDAngle = 360 / hubProps.holeCount;

        console.debug('spokeDAngle', spokeDAngle);

        let lines = [];
        for (let i = 0; i < maxRepeat; ++i) {
            let startAngle = (i * grpSize + flangHoleIndex) * spokeDAngle + flangeDeg;
            let endAngle = (i * grpSize + rimHoleIndex) * spokeDAngle;
            console.debug('startAngle', startAngle);
            console.debug('endAngle', endAngle);

            let [x1, y1, x2, y2] = getSpokeRef(flangeDr, startAngle, rimDr, endAngle);
            lines.push(
                <line x1={x1} y1={y1} x2={x2} y2={y2} style={borderStyle}></line>
            )
        }

        return lines;
    }

    let rimInDr = (rimProps.rimRadius - rimProps.rimHeight) / rimProps.rimRadius * 80;
    let flangeDrs = [
        getFlangeRef(rimProps.rimRadius, hubProps.flange1Radius),
        getFlangeRef(rimProps.rimRadius, hubProps.flange2Radius),
        getFlangeRef(rimProps.rimRadius, hubProps.flange3Radius),
        getFlangeRef(rimProps.rimRadius, hubProps.flange4Radius),
    ];

    let modeGrp = modeDef[mode];
    let spokes = [];
    for (let i = 0; i < modeGrp.length; ++i) {
    // for (let i = 0; i < 1; ++i) {
        spokes.push(...drawGrp(flangeDrs[i], 0, rimInDr, i, i + modeGrp[i]));
    }

    return (
        <>
            {spokes}
        </>
    )
}

export default function RightView(props: IViewProps) {
    let size = props.size || [300, 300];
    if (typeof size === 'number') {
        size = [size, size];
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
            <svg className={'f-fit-content'} viewBox={'0 0 200 200'}>
                <RimView {...props.rimProps}/>
                <HubView {...props}/>
                <SpokeView {...props}/>
            </svg>
        </div>
    )

}