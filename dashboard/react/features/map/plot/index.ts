import { countLayers } from './layerCounts';
import { markNewMarkers } from './newMarkers';
import { plotAir } from './renders/air';
import { plotChokepoints } from './renders/chokepoints';
import { conflictRings } from './renders/conflictRings';
import { plotDisasters } from './renders/disasters';
import { plotGdelt } from './renders/gdelt';
import { plotHealth } from './renders/health';
import { plotLabels } from './renders/labels';
import { plotMilitaryAir } from './renders/militaryAir';
import { plotNews } from './renders/news';
import { plotNuclear } from './renders/nuclear';
import { plotOutages } from './renders/outages';
import { plotQuakes } from './renders/quakes';
import { plotRadiation } from './renders/radiation';
import { plotSdr } from './renders/sdr';
import { plotShips } from './renders/ships';
import { plotSpace } from './renders/space';
import { plotThermal } from './renders/thermal';
import { plotTracks } from './renders/tracks';
import { trackTrails } from './renders/trails';
import { plotWeather } from './renders/weather';
import type { LayerPlotter, LooseRecord, PlotContext, PlotInput, PlotResult } from './types';
import { asRec, ptFeat } from './utils';
import { visiblePoints } from './visiblePoints';

const LAYER_PLOTTERS: LayerPlotter[] = [
  plotAir,
  plotMilitaryAir,
  plotThermal,
  plotChokepoints,
  plotNuclear,
  plotShips,
  plotSdr,
  plotDisasters,
  plotOutages,
  plotHealth,
  plotNews,
  plotWeather,
  plotRadiation,
  plotSpace,
  plotGdelt,
  plotTracks,
  plotQuakes,
];

export function plotData(input: PlotInput): PlotResult {
  const now = input.now ?? Date.now();
  const ctx: PlotContext = { D: input.data as unknown as LooseRecord, input, now, points: [], labels: [] };
  LAYER_PLOTTERS.forEach((plot) => plot(ctx));
  const layerCounts = countLayers(ctx.points, asRec(ctx.D.gdelt));
  const mapPoints = visiblePoints(ctx.points, input, now);
  const nextSeen = markNewMarkers(mapPoints, input.seenMarkers);
  return {
    points: { type: 'FeatureCollection', features: mapPoints.map(ptFeat) },
    rings: conflictRings(ctx),
    trails: trackTrails(ctx),
    labels: plotLabels(ctx),
    layerCounts,
    nextSeen,
    mapPoints,
  };
}

export type {
  MapPoint,
  PlotInput,
  PlotLabel,
  PlotResult,
  PlotShips,
  PlotTracks,
  QuakeRow,
  ShipBox,
  ShipRow,
  TrackRow,
} from './types';
