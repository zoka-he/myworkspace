import { Button } from "antd";
import { EnvironmentOutlined, CopyFilled, CloseOutlined } from '@ant-design/icons';
import store, { IRootState } from "@/src/store";
import { connect } from 'react-redux';
import { addPosition, removePosition } from "@/src/store/dayEditorSlice";
import dictionary from "./dictionary";

const mapStateToProps = (state: IRootState) => {
    return {
        positions: state.dayEditorSlice.positions,
    }
}

interface ICopyListProps {
    refData: any
    positions: any[]
    isMeLocateSet: boolean
    onPaste: (data: any) => void
}

function CopyList(props: ICopyListProps) {

    function copyThisNode() {
        store.dispatch(addPosition(props.refData));
    }

    function pasteData(data: any) {
        props.onPaste(data);
    }

    function removeIndex(index: number) {
        store.dispatch(removePosition(index));
    }

    let positions = [];

    if (props.positions?.length) {
        props.positions.forEach((item, index) => {
            let buttonText = [
                dictionary.type(item.type),
                item.addr,
                dictionary.drivingType(item.drivingType),
                `停留${dictionary.stayTime(item.stayTime)}`
            ].join('，');
            positions.push(<div>
                <Button type="text" icon={<EnvironmentOutlined />} onClick={() => pasteData(item)}>{buttonText}</Button>
                <Button type="text" icon={<CloseOutlined />} onClick={() => removeIndex(index)}/>
            </div>)
        })
        
    }

    if (positions.length) {
        positions.unshift(<hr style={{ margin: 10, border: 'none', borderTop: '#ccc 1px solid' }} />);
    }

    return (
        <div>
            <div>
                <Button
                    type="text"
                    icon={<CopyFilled />}
                    disabled={!props.isMeLocateSet}
                    onClick={() => copyThisNode()}
                >复制</Button>
            </div>
            {positions}
        </div>
    );
}

export default connect(mapStateToProps)(CopyList);