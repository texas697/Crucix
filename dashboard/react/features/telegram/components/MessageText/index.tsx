import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CLASSES } from '../../classes';
import { STYLES } from '../../styles';

export interface MessageTextProps {
  text: string;
  className?: string;
  hideUrl?: string | null;
}

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

function stripTrailing(url: string): [string, string] {
  const match = /[.,;:!?)\]]+$/.exec(url);
  if (!match) return [url, ''];
  return [url.slice(0, -match[0].length), match[0]];
}

export function MessageText({ text, className, hideUrl = null }: MessageTextProps) {
  const body = hideUrl ? text.replace(hideUrl, '').trim() : text;
  if (!body) return null;
  const parts = body.split(URL_RE);
  return (
    <Typography className={className} sx={{ whiteSpace: 'pre-wrap' }} dir="auto">
      {parts.map((part, i) => {
        if (i % 2 === 0) return part;
        const [url, tail] = stripTrailing(part);
        return (
          <span key={`${url}-${i}`}>
            <Box component="a" href={url} target="_blank" rel="noopener noreferrer" className={CLASSES.messageLink} sx={STYLES.messageLink}>
              {url}
            </Box>
            {tail}
          </span>
        );
      })}
    </Typography>
  );
}
