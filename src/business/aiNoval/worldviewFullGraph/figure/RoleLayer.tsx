import { useContext, useMemo } from "react";
import * as d3 from "d3";
import GraphDataContext from "../graphDataContext";
import FigureCommonContext from "./figureCommonContainer";
import styles from "./RoleLayer.module.scss";
import { useRoles } from '../hooks';

function buildPath(points: [number, number][]): { d: string; flipY: boolean } | null {
  if (points.length < 2) return null;
  const yInc = points[0][1] <= points[points.length - 1][1];
  const ptsForLine: [number, number][] = yInc
    ? points
    : points.map(([x, y]) => [x, -y] as [number, number]);
  const line = d3
    .line<[number, number]>()
    .x((d) => d[0])
    .y((d) => d[1])
    .curve(d3.curveMonotoneY);
  const d = line(ptsForLine);
  if (!d) return null;
  return { d, flipY: !yInc };
}

function roleStroke(roleId: number): string {
  const hue = (Math.abs(roleId) * 47) % 360;
  return `hsl(${hue} 42% 48%)`;
}

interface IRoleSubLayerProps {
  relationType: string;
}

export function RoleSubLayer(props: IRoleSubLayerProps) {
  const { rolePositions } = useContext(GraphDataContext);
  const { getXofGeoCode, timelineToScreenY, svgSize } = useContext(FigureCommonContext);
  const showRelationLine = props.relationType === "role-event";
  const [roleInfoList] = useRoles();

  const data = useMemo(() => {
    const rows = Array.isArray(rolePositions) ? rolePositions : [];
    const byRole = new Map<number, typeof rows>();
    rows.forEach((row) => {
      const roleId = Number(row.role_id);
      if (!Number.isFinite(roleId)) return;
      const list = byRole.get(roleId) || [];
      list.push(row);
      byRole.set(roleId, list);
    });

    const lineList: { roleId: number; d: string; flipY: boolean }[] = [];
    const pointList: Array<{ key: string; roleId: number; x: number; y: number; geoCode: string; time: number; showLabel: boolean }> = [];

    for (const [roleId, list] of Array.from(byRole.entries())) {
      const sorted = [...list]
        .filter((r) => r.geo_code && r.occurred_at != null)
        .sort((a, b) => Number(a.occurred_at) - Number(b.occurred_at));
      const pts: [number, number][] = sorted.map((r) => [
        getXofGeoCode(String(r.geo_code)),
        timelineToScreenY(Number(r.occurred_at)),
      ]);
      const built = buildPath(pts);
      if (built) lineList.push({ roleId, d: built.d, flipY: built.flipY });
      const rolePoints = sorted.map((r, i) => ({
        key: `${roleId}-${r.id ?? i}`,
        roleId,
        x: getXofGeoCode(String(r.geo_code)),
        y: timelineToScreenY(Number(r.occurred_at)),
        geoCode: String(r.geo_code),
        time: Number(r.occurred_at),
      }));
      // 仅在当前视口可见区域内挑选“最上方”点做标签，保证随视口变化动态切换
      const visiblePoints = rolePoints.filter((p) => p.y >= 0 && p.y <= svgSize.height);
      const topPointKey = visiblePoints.length
        ? visiblePoints.reduce((prev, cur) => (cur.y < prev.y ? cur : prev), visiblePoints[0]).key
        : null;
      rolePoints.forEach((p) => {
        pointList.push({
          ...p,
          showLabel: p.key === topPointKey,
        });
      });
    }

    return { lineList, pointList };
  }, [rolePositions, getXofGeoCode, timelineToScreenY, svgSize.height]);

  function renderRelationLine({ roleId, d, flipY }: { roleId: number; d: string; flipY: boolean }) {
    return (
      <g key={`role-pos-rel-${roleId}`} transform={flipY ? "scale(1,-1)" : undefined}>
        <path className={styles.roleRelationLine} d={d} stroke={roleStroke(roleId)} />
      </g>
    );
  }

  function renderRolePoint({ key, roleId, x, y, showLabel }: { key: string; roleId: number; x: number; y: number; showLabel: boolean }) {
    const roleInfo = roleInfoList.find((r) => r.id === roleId);
    const roleName = roleInfo?.name ?? `#${roleId}`;

    

    return (
      <g key={`role-pos-point-${key}`} className={styles.rolePoint} transform={`translate(${x}, ${y})`}>
        <circle className={styles.rolePointCircle} r={4} />
        {showLabel ? (
          <text className={styles.rolePointText} x={-8} y={3} textAnchor="end">
            {roleName}
          </text>
        ) : null}
      </g>
    );
  }

  return (
    <g className={styles.roleLayer}>
      {showRelationLine
        ? data.lineList.map(renderRelationLine)
        : null}
      {data.pointList.map(renderRolePoint)}
    </g>
  );
}