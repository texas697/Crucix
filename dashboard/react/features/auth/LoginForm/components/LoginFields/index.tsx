import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { CLASSES } from '../../../classes';
import { PASSWORD_MIN_LENGTH, SUBMIT_LABELS, TEXT } from '../../consts';
import { STYLES } from '../../styles';
import type { LoginActions, LoginFormState } from '../../types';

export interface LoginFieldsProps {
  form: LoginFormState;
  actions: LoginActions;
  isReady: boolean;
}

const SHRINK = { shrink: true };
const REQUIRED = { required: true };
const PASSWORD_INPUT = { required: true, minLength: PASSWORD_MIN_LENGTH };

export function LoginFields({ form, actions, isReady }: LoginFieldsProps) {
  const { mode, email, password, busy } = form;
  const isBusy = busy !== null;
  const isSubmitting = busy === 'form';
  const showPassword = mode !== 'reset';
  return (
    <Box component="form" id="form" autoComplete="on" className={CLASSES.form} sx={STYLES.form} onSubmit={actions.onSubmit}>
      <TextField
        id="email"
        type="email"
        name="email"
        label={TEXT.emailLabel}
        className={CLASSES.fieldEmail}
        sx={STYLES.field}
        value={email}
        onChange={actions.onEmailChange}
        placeholder={TEXT.emailPlaceholder}
        autoComplete="email"
        fullWidth
        disabled={isBusy}
        inputProps={REQUIRED}
        InputLabelProps={SHRINK}
      />
      {showPassword && (
        <TextField
          id="password"
          type="password"
          name="password"
          label={TEXT.passwordLabel}
          className={CLASSES.fieldPassword}
          sx={STYLES.field}
          value={password}
          onChange={actions.onPasswordChange}
          placeholder={TEXT.passwordPlaceholder}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          fullWidth
          disabled={isBusy}
          inputProps={PASSWORD_INPUT}
          InputLabelProps={SHRINK}
        />
      )}
      <Button id="submit" type="submit" className={CLASSES.submit} sx={STYLES.submit} disabled={!isReady || isBusy}>
        {isSubmitting ? TEXT.submitting : SUBMIT_LABELS[mode]}
      </Button>
    </Box>
  );
}
