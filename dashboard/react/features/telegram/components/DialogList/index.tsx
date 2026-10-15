import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dialogs;
    return dialogs.filter((d) => d.title.toLowerCase().includes(q));
  }, [dialogs, query]);

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
        {filtered.length === 0 ? (
          <Box sx={STYLES.emptyState}>
            <Typography variant="body2">No matching chats</Typography>
          </Box>
        ) : (
          filtered.map((dialog) => (
            <DialogItem
              key={dialog.id}
              dialog={dialog}
              isSelected={activeChatId === dialog.id}
              onSelect={onSelectChat}
            />
          ))
        )}
      </Box>
    </Box>
  );
}
