import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { CLASSES } from '../../classes';
import type { DigestTaste as DigestTasteValue } from '../../types';
import { STYLES } from './styles';

export interface DigestTasteProps {
  taste: DigestTasteValue;
}

export function DigestTaste({ taste }: DigestTasteProps) {
  if (taste.likes.length === 0 && taste.dislikes.length === 0) return null;
  return (
    <Stack direction="row" className={CLASSES.taste} sx={STYLES.taste}>
      <Box component="span" className={CLASSES.tasteLabel}>YOUR TASTE:</Box>
      {taste.likes.map((t) => <Box component="b" key={`like:${t}`} className={CLASSES.tasteLike} sx={STYLES.tasteLike}>+{t}</Box>)}
      {taste.dislikes.map((t) => <Box component="span" key={`dislike:${t}`} className={CLASSES.tasteDislike} sx={STYLES.tasteDislike}>−{t}</Box>)}
    </Stack>
  );
}
