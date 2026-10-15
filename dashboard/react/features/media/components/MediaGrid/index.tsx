import { GRID_CHANNELS } from '../../channels';
import { CLASSES } from '../../classes';
import { GridCell } from '../GridCell';

export function MediaGrid() {
  return (
    <div className={CLASSES.grid} id="grid">
      {GRID_CHANNELS.map((c) => <GridCell key={c.id} channel={c} />)}
    </div>
  );
}
