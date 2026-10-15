import { CLASSES } from '../../classes';

export function MapLoading() {
  return (
    <div className={CLASSES.mapLoading} id="mapLoading">
      <span className={CLASSES.mapLoadingText} id="mapLoadingText">Initializing map</span>
    </div>
  );
}
