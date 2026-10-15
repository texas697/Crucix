import GlobalStyles from '@mui/material/GlobalStyles';
import digestCss from '../../../../styles/digest.css?inline';
import readerCss from '../../../../styles/reader.css?inline';

export function DigestLegacyStyles() {
  return (
    <>
      <GlobalStyles styles={digestCss} />
      <GlobalStyles styles={readerCss} />
    </>
  );
}
