import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { useApi } from '../../app/AppProviders/hooks/useApi';
import { CLASSES } from './classes';
import { DialogList } from './components/DialogList';
import { MessageStream } from './components/MessageStream';
import { StatusNotice } from './components/StatusNotice';
import { TelegramHero } from './components/TelegramHero';
import { useTelegramDialogs } from './hooks/useTelegramDialogs';
import { useTelegramMessages } from './hooks/useTelegramMessages';
import { useTelegramRoute } from './hooks/useTelegramRoute';
import { useTelegramStatus } from './hooks/useTelegramStatus';
import { STYLES } from './styles';
import type { TelegramDialog } from './types';

export function TelegramApp() {
  const api = useApi();
  const { status } = useTelegramStatus(api);
  const route = useTelegramRoute();
  const isConnected = status?.connected === true;
  const { dialogs } = useTelegramDialogs(api, isConnected);

  const activeDialog: TelegramDialog | null = useMemo(() => {
    if (route.activeChatId) {
      return dialogs.find((d) => d.id === route.activeChatId) ?? null;
    }
    return dialogs.length > 0 ? (dialogs[0] ?? null) : null;
  }, [dialogs, route.activeChatId]);

  const { messages, isLoadingMessages } = useTelegramMessages(api, activeDialog?.id ?? null);

  return (
    <Box className={CLASSES.root} sx={STYLES.root}>
      <TelegramHero status={status} />
      <StatusNotice status={status} />
      <Box className={CLASSES.layout} sx={STYLES.layout}>
        <DialogList
          dialogs={dialogs}
          activeChatId={activeDialog?.id ?? null}
          onSelectChat={route.onSelectChat}
        />
        <MessageStream
          activeDialog={activeDialog}
          messages={messages}
          isLoadingMessages={isLoadingMessages}
        />
      </Box>
    </Box>
  );
}

export type { TelegramDialog, TelegramMessage, TelegramStatus } from './types';
