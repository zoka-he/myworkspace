import IHubProps from "./IHubProps";
import IRimProps from "./IRimProps";

export default function calculateSpokeLength(data: IRimProps & IHubProps, mode: number[]) {
    function getStartPos(
        flangePos: number, 
        flangeRadius: number
    ): [number, number, number] {
        let x = flangePos;  // 左右，左为负，右为正
        let y = flangeRadius;  // 上下，无偏转时朝正上方
        let z = 0;  // 前后

        return [x, y, z];
    }

    function getEndPos(
        rimRadius: number,
        rimHeight: number,
        holeCount: number,
        holeShift: number
    ): [number, number, number] {
        let r = rimRadius - rimHeight;
        let rad = 2 * Math.PI / holeCount * holeShift;

        let x = 0;  // 左右
        let y = r * Math.cos(rad);  // 上下，无偏转时为正上方
        let z = r * Math.sin(rad);  // 前后

        return [x, y, z];
    }

    function getDistance(pos1: [number, number, number], pos2: [number, number, number]) {
        return Math.sqrt(
            (pos1[0] - pos2[0]) ** 2 +
            (pos1[1] - pos2[1]) ** 2 +
            (pos1[2] - pos2[2]) ** 2
        )
    }

    return [
        [
            getDistance(
                getStartPos(
                    -0.5 * data.hubLength + data.flange1Pos, 
                    data.flange1Radius
                ),
                getEndPos(
                    data.rimRadius, 
                    data.rimHeight, 
                    data.holeCount, 
                    mode[0]
                )
            ),
            data.holeCount / mode.length
        ],
        [
            getDistance(
                getStartPos(
                    -0.5 * data.hubLength + data.flange2Pos, 
                    data.flange2Radius
                ),
                getEndPos(
                    data.rimRadius, 
                    data.rimHeight, 
                    data.holeCount, 
                    mode[1]
                )
            ),
            data.holeCount / mode.length
        ],
        [
            getDistance(
                getStartPos(
                    0.5 * data.hubLength - data.flange3Pos, 
                    data.flange3Radius
                ),
                getEndPos(
                    data.rimRadius, 
                    data.rimHeight, 
                    data.holeCount, 
                    mode[2]
                )
            ),
            data.holeCount / mode.length
        ],
        [
            getDistance(
                getStartPos(
                    0.5 * data.hubLength - data.flange4Pos, 
                    data.flange4Radius
                ),
                getEndPos(
                    data.rimRadius, 
                    data.rimHeight, 
                    data.holeCount, 
                    mode[3]
                )
            ),
            data.holeCount / mode.length
        ]
    ]
}