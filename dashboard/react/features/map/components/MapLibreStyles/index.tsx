import GlobalStyles from '@mui/material/GlobalStyles';
import maplibreCss from 'maplibre-gl/dist/maplibre-gl.css?inline';

export function MapLibreStyles() {
  return <GlobalStyles styles={maplibreCss} />;
}
