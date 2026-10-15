import Box from '@mui/material/Box';
import { useApi } from '../../app/AppProviders/hooks/useApi';
import { useSession } from '../../app/AppProviders/hooks/useSession';
import { useSettingsDialog } from '../../app/AppShell/hooks/useSettingsDialog';
import { Reader } from '../reader/Reader';
import { CLASSES } from './classes';
import { DigestFilters } from './components/DigestFilters';
import { DigestGrid } from './components/DigestGrid';
import { DigestHero } from './components/DigestHero';
import { DigestTaste } from './components/DigestTaste';
import { DigestTopics } from './components/DigestTopics';
import { useDigestList } from './hooks/useDigestList';
import { useDigestView } from './hooks/useDigestView';
import { useDigestVotes } from './hooks/useDigestVotes';
import { STYLES } from './styles';
import type { DigestAppProps } from './types';

export function DigestApp({ hasTavily, now = Date.now }: DigestAppProps) {
  const api = useApi();
  const { me } = useSession();
  const { onOpen: onOpenSettings } = useSettingsDialog();
  const list = useDigestList({ api });
  const { view, searchValue, ...actions } = useDigestView({ onLoad: list.onLoad });
  const votes = useDigestVotes({ api, setItems: list.setItems });

  return (
    <Box className={CLASSES.root} sx={STYLES.root}>
      <DigestHero status={list.status} />
      <DigestFilters filter={view.filter} searchValue={searchValue} onChooseFilter={actions.onChooseFilter} onSearchChange={actions.onSearchChange} />
      <DigestTopics topics={list.topics} activeTopic={view.topic} onToggleTopic={actions.onToggleTopic} />
      <DigestTaste taste={list.taste} />
      <DigestGrid items={list.items} isLoading={list.isLoading} now={now} onOpen={actions.onOpenArticle} onRate={votes.onRateFromCard} />
      <Reader
        target={view.openArticleId ? { id: view.openArticleId } : null}
        api={api}
        me={me}
        hasTavily={hasTavily}
        onClose={actions.onCloseReader}
        onOpenSettings={onOpenSettings}
        onResolved={actions.onResolved}
        onVote={votes.onApplyVote}
        onTopic={actions.onSetTopic}
        now={now}
      />
    </Box>
  );
}

export type { DigestAppProps, DigestCardItem, DigestListResponse, DigestTopicCount } from './types';
