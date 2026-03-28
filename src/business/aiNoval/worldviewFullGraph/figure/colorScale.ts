import * as d3 from "d3";
import CryptoJS from "crypto-js";
import type { IFactionDefData, IStoryLine } from "@/src/types/IAiNoval";

/** 无匹配剧情线 id 时使用的中性色 */
export const STORY_LINE_UNKNOWN_COLOR = "#888888";

/** 阵营标签为空时 */
export const FACTION_LABEL_EMPTY_COLOR = "#888888";

const U32_MAX = 0xffff_ffff;

/**
 * 对标签字符串原样取 MD5，再派生 HSL：色相 [0,360)、饱和度 50%~100%、明度 40%~60%。
 * 相同标签始终得到相同颜色；空字符串返回 {@link FACTION_LABEL_EMPTY_COLOR}。
 */
export function colorFromMd5Label(label: string): string {
    if (label.length === 0) return FACTION_LABEL_EMPTY_COLOR;

    const hash = CryptoJS.MD5(label).toString();
    const h32 = parseInt(hash.slice(0, 8), 16);
    const s32 = parseInt(hash.slice(8, 16), 16);
    const l32 = parseInt(hash.slice(16, 24), 16);

    const hue = h32 % 360;
    const sat = 50 + (s32 % 50);
    const light = 40 + (l32 % 20);

    return `hsl(${hue}, ${sat}%, ${light}%)`;
}

/** 按阵营名称（标签）取色，`name` 会先 trim；无有效名称时返回 {@link FACTION_LABEL_EMPTY_COLOR} */
export function colorFromFactionLabel(faction: Pick<IFactionDefData, "name">): string {
    const name = (faction.name ?? "").trim();
    return colorFromMd5Label(name);
}

/**
 * 按剧情线 id 升序在 [0,1] 上均分，经 d3.interpolateRainbow 映射为颜色。
 */
export function createStoryLineRainbowColorScale(
    storyLineList: IStoryLine[],
): (storyLineId: number) => string {
    const sorted = [...storyLineList].sort((a, b) => a.id - b.id);
    const n = sorted.length;
    const idToT = new Map<number, number>();
    sorted.forEach((sl, i) => {
        const t = n <= 1 ? 0 : i / (n - 1);
        idToT.set(sl.id, t);
    });
    return (storyLineId: number) => {
        const t = idToT.get(storyLineId);
        if (t === undefined) return STORY_LINE_UNKNOWN_COLOR;
        return d3.interpolateRainbow(t);
    };
}
