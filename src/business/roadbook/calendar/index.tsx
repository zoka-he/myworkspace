import { Calendar } from "antd"

export default function() {
    return (
        <div className="f-fit-height f-flex-col">
            <div className="f-flex-1" style={{ margin: '12px 0' }}>
                <Calendar></Calendar>
            </div>
        </div>
    )
}