import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import clsx from 'clsx';
import { CLASSES } from '../../../classes';
import { STYLES } from '../../styles';
import type { SettingsActions as SettingsActionHandlers, SettingsFormState } from '../../types';

export interface SettingsActionsProps {
  form: SettingsFormState;
  actions: SettingsActionHandlers;
}

export function SettingsActions({ form, actions }: SettingsActionsProps) {
  const { busy, savedLlm, message } = form;
  const isDisabled = busy !== null;
  return (
    <>
      <Box className={CLASSES.actions} sx={STYLES.actions}>
        <Button variant="outlined" type="submit" className={CLASSES.save} sx={[STYLES.actionButton, STYLES.save]} disabled={isDisabled}>
          {busy === 'save' ? 'Saving…' : 'Save'}
        </Button>
        {savedLlm && (
          <Button variant="outlined" className={CLASSES.test} sx={STYLES.actionButton} onClick={actions.onTest} disabled={isDisabled}>
            {busy === 'test' ? 'Testing…' : 'Test key'}
          </Button>
        )}
        {savedLlm && (
          <Button variant="outlined" className={CLASSES.generate} sx={STYLES.actionButton} onClick={actions.onGenerate} disabled={isDisabled}>
            {busy === 'generate' ? 'GENERATING…' : 'Generate ideas now'}
          </Button>
        )}
        {savedLlm && (
          <Button variant="outlined" className={CLASSES.remove} sx={[STYLES.actionButton, STYLES.remove]} onClick={actions.onRemove} disabled={isDisabled}>
            {busy === 'remove' ? 'Removing…' : 'Remove'}
          </Button>
        )}
      </Box>
      <Box
        className={clsx(CLASSES.message, message.tone && `${CLASSES.message}--${message.tone}`)}
        sx={[STYLES.message, message.tone === 'ok' && STYLES.messageOk, message.tone === 'err' && STYLES.messageErr]}
        role="status"
      >
        {message.text}
      </Box>
    </>
  );
}
