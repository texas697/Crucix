import Button from '@mui/material/Button';
import { CLASSES } from '../../../classes';
import { TEXT } from '../../consts';
import { STYLES } from '../../styles';
import { GoogleIcon } from '../GoogleIcon';

export interface GoogleButtonProps {
  isBusy: boolean;
  isDisabled: boolean;
  onClick: () => Promise<void>;
}

export function GoogleButton({ isBusy, isDisabled, onClick }: GoogleButtonProps) {
  return (
    <Button id="google" type="button" className={CLASSES.google} sx={STYLES.google} onClick={onClick} disabled={isDisabled}>
      <GoogleIcon />
      {isBusy ? TEXT.googleBusy : TEXT.google}
    </Button>
  );
}
