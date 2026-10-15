import { safeExternalUrl } from '../../shared/safeUrl';
import { shortAge } from './format';
import { decodeText } from './format';
import { Panel } from './Panel';

// Live news ticker, ported from the news block in renderLower() (jarvis.html 2365, 2396-2397). Reads
// the merged `newsFeed` (falling back to `news`), which the server already geo-tags and de-duplicates.
export interface TickerItem {
  headline?: string;
  source?: string;
  timestamp?: string;
  region?: string;
  urgent?: boolean;
  url?: string;
}

export interface NewsTickerProps {
  items: TickerItem[];
  limit?: number;
  now?: () => number;
}

export function NewsTicker({ items, limit = 20, now = Date.now }: NewsTickerProps) {
  const nowMs = now();
  const shown = items.slice(0, limit);

  return (
    <Panel id="pNews" title="Live news" badge={`${items.length} items`} bodyClass="pad-sm" flex="2 1 420px">
      <div className="news-list">
        {shown.length === 0
          ? <div className="empty">No recent headlines.</div>
          : shown.map((item, i) => {
            const href = safeExternalUrl(item.url) ?? undefined;
            const text = decodeText(item.headline) || '(untitled)';
            const meta = (
              <span className="news-meta">
                <span className="news-src">{item.source || 'News'}</span>
                <span>{shortAge(item.timestamp, nowMs)}</span>
                {href ? <span className="news-link" aria-hidden="true">↗</span> : null}
              </span>
            );
            const classes = `news-item${item.urgent ? ' urgent' : ''}${href ? ' clickable' : ''}`;
            return href
              ? <a key={`${i}-${text.slice(0, 24)}`} className={classes} href={href} target="_blank" rel="noopener noreferrer">{meta}<span className="news-title">{text}</span></a>
              : <div key={`${i}-${text.slice(0, 24)}`} className={classes}>{meta}<span className="news-title">{text}</span></div>;
          })}
      </div>
    </Panel>
  );
}
