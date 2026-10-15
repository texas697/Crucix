import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../classes';
import { GoogleButton } from './components/GoogleButton';
import { LoginFields } from './components/LoginFields';
import { LoginMessage } from './components/LoginMessage';
import { LoginModeTabs } from './components/LoginModeTabs';
import { TEXT, TITLES } from './consts';
import { useGoogleRedirect } from './hooks/useGoogleRedirect';
import { useLoginActions } from './hooks/useLoginActions';
import { useLoginForm } from './hooks/useLoginForm';
import { useSessionExchange } from './hooks/useSessionExchange';
import { STYLES } from './styles';
import type { LoginFormProps } from './types';

export function LoginForm({ adapter, reason, next, onSession, api, navigate }: LoginFormProps) {
  const isReady = adapter.ready;
  const form = useLoginForm({ reason, isReady });
  const onEstablish = useSessionExchange({ adapter, api, next, navigate, onSession, setMessage: form.setMessage });
  const actions = useLoginActions({ adapter, form, onEstablish });
  useGoogleRedirect({ adapter, onEstablish, setMessage: form.setMessage });

  const isBusy = form.busy !== null;

  return (
    <Box className={CLASSES.root} sx={STYLES.root}>
      <Paper className={CLASSES.card} sx={STYLES.card}>
        <Typography component="h1" className={CLASSES.title} sx={STYLES.title}>{TITLES[form.mode]}</Typography>
        <Typography className={CLASSES.sub} sx={STYLES.sub}>{TEXT.sub}</Typography>
        <LoginModeTabs mode={form.mode} hasSignup={adapter.allowSignup} onSelectMode={actions.onSelectMode} />
        <GoogleButton isBusy={form.busy === 'google'} isDisabled={!isReady || isBusy} onClick={actions.onGoogle} />
        <Divider className={CLASSES.divider} sx={STYLES.divider}>{TEXT.divider}</Divider>
        <LoginFields form={form} actions={actions} isReady={isReady} />
        <LoginMessage message={form.message} />
        <Typography className={CLASSES.foot} sx={STYLES.foot}>{TEXT.foot}</Typography>
      </Paper>
    </Box>
  );
}

export { friendlyError } from './utils';
export type { LoginFormProps, LoginMode, LoginMessage as LoginMessageValue } from './types';
