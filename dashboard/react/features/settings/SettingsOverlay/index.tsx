import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import { CLASSES } from '../classes';
import { SettingsActions } from './components/SettingsActions';
import { SettingsFields } from './components/SettingsFields';
import { SettingsHeader } from './components/SettingsHeader';
import { useSettingsActions } from './hooks/useSettingsActions';
import { useSettingsForm } from './hooks/useSettingsForm';
import { STYLES } from './styles';
import type { SettingsOverlayProps } from './types';
import { confirmRemoveDefault, deriveHints } from './utils';

const TITLE_ID = 'settings-title';

export function SettingsOverlay({
  isOpen, me, api, onClose, onProfileChange, onIdeas, onConfirmRemove = confirmRemoveDefault,
}: SettingsOverlayProps) {
  const form = useSettingsForm({ isOpen, me });
  const actions = useSettingsActions({ form, me, api, onConfirmRemove, onProfileChange, onIdeas });
  const providers = useMemo(() => me?.providers ?? [], [me]);
  const hints = useMemo(
    () => deriveHints({ providers, provider: form.provider, savedLlm: form.savedLlm }),
    [providers, form.provider, form.savedLlm],
  );

  if (!me) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className={CLASSES.dialog}
      aria-labelledby={TITLE_ID}
      PaperProps={{ className: CLASSES.panel, sx: STYLES.panel }}
    >
      <SettingsHeader me={me} titleId={TITLE_ID} onClose={onClose} />
      <Box className={CLASSES.body} sx={STYLES.body}>
        <Box component="form" id="llmForm" className={CLASSES.form} sx={STYLES.form} onSubmit={actions.onSave}>
          <SettingsFields form={form} hints={hints} providers={providers} />
          <SettingsActions form={form} actions={actions} />
        </Box>
      </Box>
      <Box className={CLASSES.foot} sx={STYLES.foot}>
        Keys never leave the server unencrypted and are never written to logs or sweep files. Remove your key at any time.
      </Box>
    </Dialog>
  );
}

export type { SettingsOverlayProps } from './types';
