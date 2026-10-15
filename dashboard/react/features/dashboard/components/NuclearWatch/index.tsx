import Box from '@mui/material/Box';
import { CLASSES } from '../../classes';
import { asArr, asRec, num, str } from '../../coerce';
import { relTime } from '../../format';
import { makeLabel } from '../../label';
import { ROW_STYLES, TONE_STYLES } from '../../styles';
import type { PanelDataProps } from '../../types';
import { NukeSiteRow } from '../NukeSiteRow';
import { Panel } from '../Panel';
import { StatusBanner } from '../StatusBanner';

export function NuclearWatch({ data, t }: PanelDataProps) {
  const tr = makeLabel(t);
  const nukeArr = asArr(data.nuke);
  const nukeMeta = asRec(data.nukeMeta);
  const liveSites = nukeArr.filter((s) => s.coverage === 'live');
  const darkSites = nukeArr.filter((s) => s.coverage !== 'live');
  const isAllNormal = nukeArr.every((s) => !s.anom);
  const nukeSensorsN = liveSites.reduce((a, s) => a + num(s.n), 0);
  const nukeNewest = liveSites.map((s) => str(s.last)).filter(Boolean).sort().pop();
  const nukeStatus = nukeMeta.error
    ? `⚠ ${tr('nuclear.feedDown', 'Sensor feed unavailable')}`
    : liveSites.length === 0
      ? tr('nuclear.noLive', 'No live sensors')
      : isAllNormal
        ? `● ${tr('nuclear.allSitesNormal', 'All sites normal')}`
        : `⚠ ${tr('nuclear.anomalyDetected', 'Anomaly detected')}`;
  const tone = isAllNormal && liveSites.length && !nukeMeta.error ? 'ok' : 'anom';

  return (
    <Panel
      id="pNuclear"
      title={tr('panels.nuclearWatch', 'Nuclear watch')}
      badge={`${nukeSensorsN} sensors${nukeNewest ? ` · ${relTime(nukeNewest)}` : ''}`}
      flex="1 1 240px"
    >
      <StatusBanner tone={tone} note="median · CPM">{nukeStatus}</StatusBanner>
      {liveSites.map((s, i) => <NukeSiteRow key={`${str(s.site)}-${i}`} site={s} />)}
      {darkSites.length ? (
        <Box className={CLASSES.siteRow} sx={[ROW_STYLES.siteRow, TONE_STYLES.dimRow]}>
          <Box component="span" className={CLASSES.siteName}>
            {tr('nuclear.noSensors', 'No public sensors')}:{' '}
            {darkSites.map((s) => str(s.site).replace(/ \(.*\)$/, '')).join(', ')}
          </Box>
        </Box>
      ) : null}
    </Panel>
  );
}
