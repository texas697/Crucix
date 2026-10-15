import { useEffect, useRef } from 'react';

// The Signal Guide overlay. Ported from the legacy dashboard `jarvis.html`:
//   - the `signalGuideItems` table (1111-1224) — verbatim
//   - `renderGlossary()` (2789-2804)
//   - the `#glossaryOverlay` markup (753-766)
//   - `openGlossary()` / `closeGlossary()` (2806-2820), including the Escape/backdrop close and the
//     body-scroll lock
//
// The legacy rendered a flat list of cards, each with a term + category tag and four labelled
// lines (Meaning / Why it matters / Not proof of / Example); the order and wording are preserved.
// The trigger button lives with the host — `open` is fully controlled here.

export interface SignalGuideItem {
  term: string;
  category: string;
  meaning: string;
  matters: string;
  notMeaning: string;
  example: string;
}

/** Verbatim port of the legacy `signalGuideItems` (jarvis.html 1111-1224). */
export const signalGuideItems: SignalGuideItem[] = [
  {
    term: 'No Callsign',
    category: 'Air',
    meaning: 'OpenSky received an aircraft track without a usable callsign or flight ID in that record.',
    matters: 'Useful as an opacity signal. A cluster of missing callsigns can indicate incomplete transponder metadata or less transparent traffic.',
    notMeaning: 'Not proof of military, covert, or hostile activity on its own.',
    example: 'South China Sea: No Callsign 6 of 152 means 6 tracks in that theater had no usable callsign in the feed.',
  },
  {
    term: 'High Altitude',
    category: 'Air',
    meaning: 'Aircraft above 12,000 meters, roughly 39,000 feet, in the current OpenSky snapshot.',
    matters: 'Separates cruise-level traffic from lower-altitude local or regional movement.',
    notMeaning: 'Not a danger score and not inherently unusual. Commercial jets commonly operate here.',
    example: 'High Altitude 2 means only 2 tracked aircraft in that hotspot were above the cruise threshold at that snapshot.',
  },
  {
    term: 'Top Countries',
    category: 'Air',
    meaning: 'The most common OpenSky origin_country values among aircraft in that hotspot.',
    matters: 'Useful for understanding the rough composition of traffic flowing through a theater.',
    notMeaning: 'Not who is controlling the aircraft right now and not a direct indicator of military ownership.',
    example: 'China (61), Philippines (39), Taiwan (17) means those were the top registered origin countries in the snapshot.',
  },
  {
    term: 'FRP',
    category: 'Thermal',
    meaning: 'Fire Radiative Power. This is the intensity of one specific FIRMS hotspot, measured in megawatts.',
    matters: 'Higher FRP usually means a hotter, larger, or more energetic fire event at that exact point.',
    notMeaning: 'Not the intensity of the whole region and not automatic proof of conflict activity.',
    example: 'Sudan / Horn of Africa: FRP 92.3 MW describes that one hotspot, while Total 1,451 describes the entire regional detection count.',
  },
  {
    term: 'Total Detections',
    category: 'Thermal',
    meaning: 'The total number of FIRMS thermal detections in the entire region bucket for the current sweep.',
    matters: 'Useful for spotting unusually active fire clusters, especially when compared with historical baselines or night activity.',
    notMeaning: 'Not a count for the single map point you clicked and not necessarily a conflict count.',
    example: 'Total 1,451 means the whole Sudan / Horn of Africa bucket had 1,451 detections in that sweep.',
  },
  {
    term: 'Night Detections',
    category: 'Thermal',
    meaning: 'Thermal detections tagged as occurring at night inside the broader FIRMS region bucket.',
    matters: 'Nighttime heat can be more noteworthy because it is less likely to be routine daytime land burning.',
    notMeaning: 'Not a direct combat indicator. It still needs context from location, baseline, and corroborating sources.',
    example: 'Night 140 means 140 of the 1,451 regional detections were nighttime detections in that sweep.',
  },
  {
    term: 'Chokepoint',
    category: 'Maritime',
    meaning: 'A strategic maritime corridor or passage where trade and energy flows can be delayed, diverted, or disrupted.',
    matters: 'These nodes matter because a disruption here can affect shipping costs, transit times, and commodity pricing globally.',
    notMeaning: 'Not proof that disruption is happening now. It is a strategic watch location.',
    example: 'Bab el-Mandeb or the Strait of Hormuz matter because shipping and energy flows concentrate there.',
  },
  {
    term: 'SDR Receiver',
    category: 'Signals',
    meaning: 'A publicly reachable software-defined radio receiver in or near a region of interest.',
    matters: 'Dense receiver coverage can give you more ability to monitor communications or signal activity in a theater.',
    notMeaning: 'Not evidence of hostile emissions or a threat by itself. It is an observation and monitoring layer.',
    example: 'South China Sea SDR count means publicly accessible KiwiSDR receivers are available in or near that zone.',
  },
  {
    term: 'CPM',
    category: 'Radiation',
    meaning: 'Counts per minute from a radiation monitoring source, used here for relative radiation status at a site.',
    matters: 'Useful for spotting anomalies against the site’s normal range or comparing consecutive readings.',
    notMeaning: 'Not a direct safety verdict on its own. Interpretation depends on local baseline and trend, not the raw number alone.',
    example: 'A site reading 33 CPM can be normal if that location’s usual background level is in the same range.',
  },
  {
    term: 'HY Spread',
    category: 'Macro',
    meaning: 'High-yield credit spread, shown here as a stress proxy from FRED credit data.',
    matters: 'When spreads widen, markets are usually pricing more credit stress and tighter financial conditions.',
    notMeaning: 'Not a recession call by itself. It is one stress signal among many.',
    example: 'A rising HY Spread alongside higher VIX and weaker equities is a stronger risk-off pattern than HY alone.',
  },
  {
    term: 'VIX',
    category: 'Macro',
    meaning: 'The CBOE Volatility Index, commonly used as a market-implied fear or volatility gauge.',
    matters: 'Higher VIX often means more expected equity volatility and more defensive market positioning.',
    notMeaning: 'Not a direct forecast of a crash and not a geopolitical indicator by itself.',
    example: 'VIX above 20 with widening HY spreads is a stronger stress pattern than VIX alone.',
  },
  {
    term: 'GSCPI',
    category: 'Macro',
    meaning: 'The Global Supply Chain Pressure Index, a broad indicator of global supply-chain strain.',
    matters: 'It helps translate geopolitical or weather disruptions into likely pressure on shipping, inventory, and pricing.',
    notMeaning: 'Not a live market price and not a company-specific supply-chain score by itself.',
    example: 'A higher GSCPI makes route or energy shocks more likely to spill into broader cost pressure.',
  },
  {
    term: 'WHO Alert',
    category: 'Health',
    meaning: 'A WHO Disease Outbreak News item or outbreak-related bulletin surfaced in the health layer.',
    matters: 'Useful for watching outbreaks that could affect travel, supply chains, humanitarian stress, or regional operating conditions.',
    notMeaning: 'Not a pandemic declaration and not automatically high severity.',
    example: 'A WHO alert in a port-heavy region matters more if it overlaps shipping, border controls, or local instability signals.',
  },
  {
    term: 'Sweep Delta',
    category: 'Platform',
    meaning: 'The change summary between the current sweep and the previous one, including new, escalated, and de-escalated signals.',
    matters: 'Useful for spotting what changed recently instead of re-reading the full dashboard from scratch.',
    notMeaning: 'Not a full risk model. It is a directional change layer on top of the raw signals.',
    example: 'A delta marked risk-off with several new and escalated items means the latest sweep materially worsened the signal mix.',
  },
];

export interface SignalGuideProps {
  /** Controlled by the host. When false the overlay renders nothing. */
  open: boolean;
  onClose: () => void;
}

const TITLE_ID = 'glossaryTitle';

/**
 * The `#glossaryOverlay` modal. `open` is controlled by the host; Escape and a backdrop click call
 * `onClose`. Focus moves into the panel on open and is restored to the previously focused element on
 * close/unmount (the legacy had no focus management; this is the only deliberate addition).
 */
export function SignalGuide({ open, onClose }: SignalGuideProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="glossary-overlay show"
      id="glossaryOverlay"
      data-surface="signal-guide"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glossary-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="glossary-head">
          <div>
            <div className="glossary-kicker">Signal Guide</div>
            <div className="glossary-title" id={TITLE_ID}>What the signals actually mean</div>
            <div className="glossary-sub">Plain-English interpretation, why it matters, and what you should not infer from it.</div>
          </div>
          <button className="glossary-close" type="button" onClick={onClose} aria-label="Close signal guide">&times;</button>
        </div>
        <div className="glossary-body" id="glossaryBody">
          {signalGuideItems.map((item) => (
            <div className="glossary-card" key={item.term}>
              <div className="glossary-term">
                <strong>{item.term}</strong>
                <span className="glossary-tag">{item.category}</span>
              </div>
              <div className="glossary-line"><span className="glossary-label">Meaning</span>{item.meaning}</div>
              <div className="glossary-line"><span className="glossary-label">Why it matters</span>{item.matters}</div>
              <div className="glossary-line"><span className="glossary-label">Not proof of</span>{item.notMeaning}</div>
              <div className="glossary-line"><span className="glossary-label">Example</span>{item.example}</div>
            </div>
          ))}
        </div>
        <div className="glossary-foot">Treat these as interpretation guides, not conclusions. Stronger judgments should come from corroboration across multiple layers, not from a single signal viewed in isolation.</div>
      </div>
    </div>
  );
}
