import MagicSystemDefService from "@/src/services/aiNoval/magicSystemDef";
import { IMagicSystemDef } from "@/src/types/IAiNoval";

const magicSystemDefService = new MagicSystemDefService();

export default async function getMagicSystem(worldviewId: number): Promise<IMagicSystemDef[]> {
    const magicSystemDefinitions = await magicSystemDefService.getFullInfoOfWorldview(worldviewId);
    return magicSystemDefinitions;
}