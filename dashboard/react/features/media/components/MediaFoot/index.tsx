import { CLASSES } from '../../classes';

export function MediaFoot() {
  return (
    <div className={CLASSES.foot}>
      Live streams are provided by the broadcasters and may be geo-restricted or intermittent.
      If a feed does not play, use “Open feed” or pick another channel. Keyboard: ←/→ change
      channel, m mute, f fullscreen.
    </div>
  );
}
