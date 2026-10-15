import type { Map as MaplibreMap } from 'maplibre-gl';
import { PLANE_ICON_ID, PLANE_ICON_SIZE, PLANE_SVG } from './consts';

export function planeIconUrl(): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PLANE_SVG)}`;
}

export function registerPlaneIcon(map: MaplibreMap): void {
  if (map.hasImage(PLANE_ICON_ID)) return;
  const img = new Image(PLANE_ICON_SIZE, PLANE_ICON_SIZE);
  img.onload = () => {
    if (!map.hasImage(PLANE_ICON_ID)) map.addImage(PLANE_ICON_ID, img, { sdf: true });
  };
  img.src = planeIconUrl();
}
