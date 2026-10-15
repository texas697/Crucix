import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import clsx from 'clsx';
import { CLASSES } from '../../../classes';
import { STYLES } from '../../styles';
import type { LoginMessage as LoginMessageValue } from '../../types';

export interface LoginMessageProps {
  message: LoginMessageValue;
}

export function LoginMessage({ message }: LoginMessageProps) {
  if (message.tone === 'err') {
    return (
      <Alert id="msg" severity="error" icon={false} className={CLASSES.alert} sx={STYLES.alert}>
        {message.text}
      </Alert>
    );
  }
  return (
    <Box
      id="msg"
      className={clsx(CLASSES.message, message.tone && `${CLASSES.message}--${message.tone}`)}
      sx={[STYLES.message, message.tone === 'ok' && STYLES.messageOk]}
      aria-live="polite"
    >
      {message.text}
    </Box>
  );
}
