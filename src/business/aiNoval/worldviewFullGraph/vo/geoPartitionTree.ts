import { IGeoUnionData } from "@/src/types/IAiNoval";
import { IGeoTreeItem } from "../../common/geoDataUtil";
import { GeoPartitionData } from "./geoPartitionData";

export class GeoPartitionTree extends GeoPartitionData {
    public children: GeoPartitionTree[];

    public static fromGeoTree(tree?: IGeoTreeItem<IGeoUnionData>[]): GeoPartitionTree[] {
        if (!tree?.length) return [];

        return tree.map(item => {
            if (!item) return null;
            // if (item.data?.has_geo_area !== 'Y') return null;

            let children = GeoPartitionTree.fromGeoTree(item.children) || [];
            // children = _.sortBy(children, item => item.code);
            return new GeoPartitionTree(item.data, children);
        }).filter(item => item !== null);
    }

    constructor(data: IGeoUnionData, children: GeoPartitionTree[]) {
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

    public static getDeep(tree?: GeoPartitionTree[]): number {
        if (!tree?.length) return 0;
        return Math.max(...tree.map(item => item.getDeep()));
    }

    public toData(): GeoPartitionData {
        return new GeoPartitionData(this);
    }

    public flatByDeep(deep: number = 1): GeoPartitionTree[] {
        let nextDeep = deep - 1;
        if (!nextDeep || nextDeep <= 0) {
            return [new GeoPartitionTree(this.toData(), [])];
        } else {
            if (this.children.length === 0) {
                return [new GeoPartitionTree(this.toData(), [])];
            } else {
                return this.children.map(item => item.flatByDeep(nextDeep)).flat();
            }
        }
    }

    public static flatByDeep(tree?: GeoPartitionTree[], deep: number = 1): GeoPartitionTree[] {
        if (!tree?.length) return [];
        return tree.map(item => item.flatByDeep(deep)).flat();
    }
}
