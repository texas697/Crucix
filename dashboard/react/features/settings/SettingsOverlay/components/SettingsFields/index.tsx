import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { LlmProvider } from '../../../../../api/types';
import { CLASSES } from '../../../classes';
import { STYLES } from '../../styles';
import { useSettingsFieldHandlers } from '../../hooks/useSettingsFieldHandlers';
import type { SettingsFormState, SettingsHints } from '../../types';

export interface SettingsFieldsProps {
  form: SettingsFormState;
  hints: SettingsHints;
  providers: LlmProvider[];
}

const SHRINK = { shrink: true };
const SELECT_PROPS = { className: CLASSES.fieldProviderSelect, MenuProps: { className: CLASSES.fieldProviderMenu } };

export function SettingsFields({ form, hints, providers }: SettingsFieldsProps) {
  const handlers = useSettingsFieldHandlers({ form });
  return (
    <>
      <TextField
        select
        autoFocus
        id="llmProvider"
        label="Provider"
        className={CLASSES.fieldProvider}
        sx={STYLES.field}
        value={form.provider}
        onChange={handlers.onProviderChange}
        SelectProps={SELECT_PROPS}
        InputLabelProps={SHRINK}
      >
        {providers.map((p) => <MenuItem key={p.id} value={p.id} className={CLASSES.fieldProviderOption} sx={STYLES.fieldProviderOption}>{p.label}</MenuItem>)}
      </TextField>
      <TextField
        id="llmKey"
        type="password"
        label="API key"
        className={CLASSES.fieldKey}
        sx={STYLES.field}
        value={form.apiKey}
        onChange={handlers.onApiKeyChange}
        placeholder="paste your key here (e.g. sk-ant-… / sk-… / AIza…)"
        helperText={hints.keyHint}
        inputProps={{ autoComplete: 'off', spellCheck: false }}
        InputLabelProps={SHRINK}
      />
      <TextField
        id="llmModel"
        label={<>Model <Box component="span" className={CLASSES.fieldOptional} sx={STYLES.fieldOptional}>(optional)</Box></>}
        className={CLASSES.fieldModel}
        sx={STYLES.field}
        value={form.model}
        onChange={handlers.onModelChange}
        placeholder="provider default"
        helperText={hints.modelHint}
        inputProps={{ autoComplete: 'off', spellCheck: false }}
        InputLabelProps={SHRINK}
      />
      {hints.showBaseUrl && (
        <TextField
          id="llmBaseUrl"
          type="url"
          label="Base URL"
          className={CLASSES.fieldBaseUrl}
          sx={STYLES.field}
          value={form.baseUrl}
          onChange={handlers.onBaseUrlChange}
          placeholder="https://api.groq.com/openai/v1"
          helperText="Any OpenAI-compatible chat/completions endpoint (Groq, Together, DeepSeek, a public LM Studio tunnel…)."
          inputProps={{ autoComplete: 'off', spellCheck: false }}
          InputLabelProps={SHRINK}
        />
      )}
      <FormControlLabel
        className={CLASSES.autoIdeas}
        sx={STYLES.autoIdeas}
        label="Auto-refresh my ideas after every sweep (uses your key ~4×/hour)"
        control={(
          <Checkbox
            id="llmAuto"
            className={CLASSES.autoIdeasCheckbox}
            sx={STYLES.autoIdeasCheckbox}
            checked={form.isAutoIdeas}
            onChange={handlers.onAutoIdeasChange}
          />
        )}
      />
    </>
  );
}
