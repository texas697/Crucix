import { useCallback, useMemo } from 'react';
import { parseUrl } from '../../../../state/url';
import { useSession } from '../../../AppProviders/hooks/useSession';
import { useSurfaceRoute } from '../../../AppRouter/hooks/useSurfaceRoute';
import type { SettingsDialogValue } from '../../types';

export function useSettingsDialogState(): SettingsDialogValue {
  const { location, history } = useSurfaceRoute();
  const { me } = useSession();

  const isOpen = useMemo(
    () => Boolean(me) && parseUrl(location.href).q.settings === '1',
    [me, location.href],
  );

  const onOpen = useCallback(() => {
    const { path, q } = parseUrl(location.href);
    history.set(path, { ...q, settings: '1' }, { isPush: true, state: { k: 'settings' } });
  }, [history, location.href]);

  const onClose = useCallback(() => {
    if (history.afterClose('settings') === 'rewrite') {
      const { path, q } = parseUrl(location.href);
      history.set(path, { ...q, settings: '' }, { isPush: false });
    }
  }, [history, location.href]);

  return useMemo(() => ({ isOpen, onOpen, onClose }), [isOpen, onOpen, onClose]);
}
