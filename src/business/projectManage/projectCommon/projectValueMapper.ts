class ProjectValueMapper {

    private initList: [string | number | boolean, string][];

    private string2valueMap = new Map;
    private value2stringMap = new Map;

    private notMatchedVal: string | number | boolean | undefined = undefined;
    private notMatchedStr: string = ''

    constructor(
        maplist: [string | number | boolean, string][],
        notMatchedStr: string = '',
        notMatchedVal: string | number | boolean | undefined = undefined,
    ) {
        if (!maplist.length) {
            throw new Error('ProjectValueMapper的构造函数必须为长度不为 0 的键值对数组');
        }

        this.initList = maplist;

        maplist.forEach(item => {
            let [val, str] = item;
            this.string2valueMap.set(str, val);
            this.value2stringMap.set(val, str);
        });

        this.notMatchedStr = notMatchedStr;
        this.notMatchedVal = notMatchedVal;
    }

    public getInitList(): [string | number | boolean, string][] {
        return this.initList;
    }

    public mapStringToValue(
        str: string, 
        notMatchedVal: string | number | boolean | undefined = undefined
    ): string | number | boolean | undefined {
        let ret = this.string2valueMap.get(str);
        if (ret) {
            return ret;
        } else {
            return notMatchedVal || this.notMatchedVal;
        } 
    }

    public mapValueToString(
        val: string | number | boolean, 
        notMatchedStr: string = ''
    ): string {
        let ret = this.value2stringMap.get(val) || this.notMatchedStr;
        if (ret) {
            return ret;
        } else {
            return notMatchedStr || this.notMatchedStr;
        }
    }





    public static taskStateMapper = new ProjectValueMapper([
        [0, '未开始'],
        [1, '执行中'],
        [2, '验证中'],
        [3, '待上线'],
        [4, '已完成'],
        [5, '已关闭'],
    ])

    public static bugStateMapper = new ProjectValueMapper([
        [ 0, '未复现'],
        [ 1, '已复现'],
        [ 2, '修复中'],
        [ 3, '待复验'],
        [ 4, '已关闭'],
    ])
    
}


export default ProjectValueMapper;