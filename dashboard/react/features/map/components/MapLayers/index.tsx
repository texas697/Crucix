import { memo } from 'react';
import { Layer, Source, type LayerProps } from 'react-map-gl/maplibre';
import { EMPTY_FC } from '../../consts';
import { MAP_SOURCES, layersForSource, type MapSourceId } from '../../mapLayers';
import type { MapFeatureCollection } from '../../types';

export interface MapLayersProps {
  points: MapFeatureCollection;
  rings: MapFeatureCollection;
  trails: MapFeatureCollection;
  spaceTrack: MapFeatureCollection;
  selected: MapFeatureCollection;
  draw: MapFeatureCollection;
}

const SOURCE_DATA: Partial<Record<MapSourceId, keyof MapLayersProps>> = {
  'src-points': 'points',
  'src-rings': 'rings',
  'src-trails': 'trails',
  'src-space-track': 'spaceTrack',
  'src-selected': 'selected',
  'src-draw': 'draw',
};

function dataFor(id: MapSourceId, props: MapLayersProps): MapFeatureCollection {
  const key = SOURCE_DATA[id];
  return key ? props[key] : EMPTY_FC;
}

export const MapLayers = memo(function MapLayers(props: MapLayersProps) {
  return (
    <>
      {MAP_SOURCES.map((id) => (
        <Source key={id} id={id} type="geojson" data={dataFor(id, props)}>
          {layersForSource(id).map((layer) => (
            <Layer key={layer.id} {...(layer as unknown as LayerProps)} />
          ))}
        </Source>
      ))}
    </>
  );
});
