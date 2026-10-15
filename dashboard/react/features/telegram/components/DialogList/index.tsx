import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { useDialogGroups } from '../../hooks/useDialogGroups';
import { STYLES } from '../../styles';
import type { TelegramDialog } from '../../types';
import { DialogItem } from '../DialogItem';

export interface DialogListProps {
  dialogs: TelegramDialog[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
}

export function DialogList({ dialogs, activeChatId, onSelectChat }: DialogListProps) {
  const [query, setQuery] = useState('');
  const groups = useDialogGroups(dialogs, query);

  return (
    <Box className={CLASSES.sidebar} sx={STYLES.sidebar}>
      <TextField
        size="small"
        placeholder="Filter chats & channels..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={CLASSES.searchField}
        sx={STYLES.searchField}
      />
      <Box className={CLASSES.dialogList} sx={STYLES.dialogList}>
        {groups.length === 0 ? (
          <Box sx={STYLES.emptyState}>
            <Typography variant="body2">{query.trim() ? 'No matching chats' : 'No chats published yet'}</Typography>
          </Box>
        ) : (
          groups.map((group, i) => (
            <Box key={group.name ?? `group-${i}`} className={CLASSES.dialogGroup} sx={STYLES.dialogGroup}>
              {group.name && (
                <Typography className={CLASSES.dialogGroupTitle} sx={STYLES.dialogGroupTitle}>
                  {group.name}
                </Typography>
              )}
              {group.dialogs.map((dialog) => (
                <DialogItem key={dialog.id} dialog={dialog} isSelected={activeChatId === dialog.id} onSelect={onSelectChat} />
              ))}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
