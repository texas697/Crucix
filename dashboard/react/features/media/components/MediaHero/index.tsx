import { CLASSES } from '../../classes';

export interface MediaHeroProps {
  channelCount: number;
}

export function MediaHero({ channelCount }: MediaHeroProps) {
  return (
    <header className={CLASSES.hero}>
      <div className={CLASSES.heroText}>
        <h1 className={CLASSES.heroTitle}>Live media</h1>
        <p className={CLASSES.heroLead}>
          Broadcaster feeds from across the world, on the map&apos;s sources. Switch channels, mute,
          go fullscreen or picture-in-picture, or open the grid to watch several at once. Streams
          are the broadcasters&apos; own public HLS feeds.
        </p>
      </div>
      <span className={CLASSES.status}>{channelCount} channels</span>
    </header>
  );
}
