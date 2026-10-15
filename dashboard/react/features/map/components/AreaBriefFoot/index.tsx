import Box from '@mui/material/Box';
import { abFormatUsd } from '../../areaBriefFormat';
import type { AbLlm } from '../../areaBriefTypes';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export interface AreaBriefFootProps {
  llm: AbLlm;
}

export function AreaBriefFoot({ llm }: AreaBriefFootProps) {
  const isUserKey = llm.keyOwner === 'user';
  const cost = llm.costLabel || abFormatUsd(llm.costUsd);
  const model = `${llm.provider || ''}${llm.model ? ` · ${llm.model}` : ''}`;
  return (
    <Box className={CLASSES.briefFoot} sx={STYLES.briefFoot}>
      <Box component="span" className={CLASSES.briefFootIcon} sx={STYLES.briefFootIcon}>{isUserKey ? '\u{1F511}' : '⚡'}</Box>
      <Box component="span" className={CLASSES.briefFootText}>
        <Box component="b" className={CLASSES.briefFootWho} sx={STYLES.briefFootWho}>{isUserKey ? 'Your AI key' : 'Site AI key'}</Box>
        {` · ${model} · `}
        {cost
          ? (
            <>
              this brief <Box component="span" className={CLASSES.briefFootCost} sx={STYLES.briefFootCost}>{cost}</Box>
              {llm.costExact ? '' : ' est.'}
            </>
          )
          : 'cost unavailable for this model'}
        .
      </Box>
    </Box>
  );
}
