import { IGeoUnionData } from "@/src/types/IAiNoval";
import { IGeoTreeItem } from "../../common/geoDataUtil";

export class GeoPartitionData {
    public id: number;
    public name: string;
    public code: string;
    public detail: string;
    
    public static fromGeoUnionData(data: IGeoUnionData): GeoPartitionData {
        return new GeoPartitionData(data);
    }

    constructor(data: IGeoUnionData) {
        this.id = data.id || -1;
        this.name = data.name || '';
        this.code = data.code || '';
        this.detail = data.description || '';
    }
}