import { IGeoUnionData } from "@/src/types/IAiNoval";
import { IGeoTreeItem } from "../../geoTree";
import _ from "lodash";

export class FlatGeoData {
    public id: number;
    public name: string;
    public code: string;
    public area_coef: number;
    public children_area_coef: number;
    public has_geo_area: string;
    
    public static fromGeoUnionData(data: IGeoUnionData): FlatGeoData {
        return new FlatGeoData(data);
    }

    public static flat = {
        fromGeoTree: {
            onlyChildren: (tree?: IGeoTreeItem<IGeoUnionData>[]): FlatGeoData[] => {
                if (!tree?.length) return [];

                return tree.map(item => {
                    if (!item) return [];

                    let children = FlatGeoData.flat.fromGeoTree.onlyChildren(item.children);

                    if (children.length === 0) {
                        if (item.data) {
                            return [FlatGeoData.fromGeoUnionData(item.data)];
                        }
                    } else {
                        return children;
                    }

                    return [];
                }).flat();
            }
        }
    }

    constructor(data: IGeoUnionData) {
        this.id = data.id || -1;
        this.name = data.name || '';
        this.code = data.code || '';
        this.area_coef = data.area_coef || 0;
        this.children_area_coef = data.children_area_coef || 0;
        this.has_geo_area = data.has_geo_area || 'N';
    }
}

export class FlatGeoDataTree extends FlatGeoData {
    public children: FlatGeoDataTree[];

    public static fromGeoTree(tree?: IGeoTreeItem<IGeoUnionData>[]): FlatGeoDataTree[] {
        if (!tree?.length) return [];

        return tree.map(item => {
            if (!item) return null;
            if (item.data?.has_geo_area !== 'Y') return null;

            let children = FlatGeoDataTree.fromGeoTree(item.children) || [];
            // children = _.sortBy(children, item => item.code);
            return new FlatGeoDataTree(item.data, children);
        }).filter(item => item !== null);
    }

    constructor(data: IGeoUnionData, children: FlatGeoDataTree[]) {
        super(data);
        this.children = children;
    }

    public getDeep(): number {
        if (this.children.length === 0) {
            return 1;
        } else {
            return 1 + Math.max(...this.children.map(item => item.getDeep()));
        }
    }

    public static getDeep(tree?: FlatGeoDataTree[]): number {
        if (!tree?.length) return 0;
        return Math.max(...tree.map(item => item.getDeep()));
    }

    public toData(): FlatGeoData {
        return new FlatGeoData(this);
    }

    public flatOnlyChildren(tree?: FlatGeoDataTree[]): FlatGeoDataTree[] {
        if (!tree?.length) return [];

        return tree.map(item => {
            if (!item) return [];

            let children = item.flatOnlyChildren(item.children);
            if (children.length === 0) {
                return [item];
            } else {
                return children;
            }
        }).flat();
    } 

    public flatByDeep(deep: number = 1): FlatGeoDataTree[] {
        let nextDeep = deep - 1;
        if (!nextDeep || nextDeep <= 0) {
            return [new FlatGeoDataTree(this.toData(), [])];
        } else {
            if (this.children.length === 0) {
                return [new FlatGeoDataTree(this.toData(), [])];
            } else {
                return this.children.map(item => item.flatByDeep(nextDeep)).flat();
            }
        }
    }

    public static flatByDeep(tree?: FlatGeoDataTree[], deep: number = 1): FlatGeoDataTree[] {
        if (!tree?.length) return [];
        return tree.map(item => item.flatByDeep(deep)).flat();
    }

    public static regenerateAreaCoef(forest?: FlatGeoDataTree[], totalAreaCoef: number = 1): FlatGeoDataTree[] {
        if (!forest?.length) return [];
        const totalAreaCoef_origin = forest.reduce((sum, item) => sum + item.area_coef, 0);
        const scale = totalAreaCoef / totalAreaCoef_origin; // 计算比例，这是对的，不要怀疑

        return forest.map(item => {
            const newAreaCoef = item.area_coef * scale;
            let children: FlatGeoDataTree[] = [];
            if (item.children.length > 0) {
                children = FlatGeoDataTree.regenerateAreaCoef(item.children, newAreaCoef) || [];
            }

            const newItem = new FlatGeoDataTree(item.toData(), children);
            newItem.area_coef = newAreaCoef;
            return newItem;
        });
    }

    /**
     * 重新计算面积系数
     * @param totalAreaCoef 重新计算后的总面积系数
     * @returns 重新计算后的地理单元树,是一个新树
     */
    public regenerateAreaCoef(totalAreaCoef: number = 1): FlatGeoDataTree {
        return FlatGeoDataTree.regenerateAreaCoef([this], totalAreaCoef)[0];
    }
}

export default FlatGeoData;