import { useMemo } from 'react';
import type { TelegramDialog } from '../../types';

export interface DialogGroup {
  name: string | null;
  dialogs: TelegramDialog[];
}

export function groupByName(dialogs: TelegramDialog[]): DialogGroup[] {
  const groups: DialogGroup[] = [];
  for (const dialog of dialogs) {
    const name = dialog.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.dialogs.push(dialog);
    else groups.push({ name, dialogs: [dialog] });
  }
  return groups;
}

export function useDialogGroups(dialogs: TelegramDialog[], query: string): DialogGroup[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q ? dialogs.filter((d) => d.title.toLowerCase().includes(q)) : dialogs;
    return groupByName(visible);
  }, [dialogs, query]);
}
