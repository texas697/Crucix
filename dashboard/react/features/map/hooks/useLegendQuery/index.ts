import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { LAYER_DEFS, matchesLayerFilter, type LayerDef } from '../../layerDefs';

export interface UseLegendQueryArgs {
  layerCounts: Record<string, number | undefined>;
}

export interface LegendQueryState {
  query: string;
  chips: LayerDef[];
  onQueryChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function useLegendQuery({ layerCounts }: UseLegendQueryArgs): LegendQueryState {
  const [query, setQuery] = useState('');
  const onQueryChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setQuery(event.target.value);
  }, []);
  const chips = useMemo(
    () => LAYER_DEFS.filter((def) => (layerCounts[def.key] || 0) > 0 && matchesLayerFilter(def, query)),
    [layerCounts, query],
  );
  return useMemo(() => ({ query, chips, onQueryChange }), [query, chips, onQueryChange]);
}
