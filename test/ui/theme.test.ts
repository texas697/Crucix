import { describe, expect, it } from 'vitest';
import { createAppTheme, createGlobalStyles, DARK_TOKENS, LIGHT_TOKENS } from '../../dashboard/react/theme';

interface StyleTree { [selector: string]: Record<string, unknown> }

describe('createAppTheme', () => {
  it('builds the dark theme from the legacy tokens', () => {
    const theme = createAppTheme('dark');
    expect(theme.palette.mode).toBe('dark');
    expect(theme.palette.background.default).toBe('#05070b');
    expect(theme.palette.background.paper).toBe('#0a0d14');
    expect(theme.palette.text.primary).toBe('#e9ecf2');
    expect(theme.palette.text.secondary).toBe('#98a1b3');
    expect(theme.palette.divider).toBe('rgba(255,255,255,0.05)');
    expect(theme.palette.crucix).toEqual(DARK_TOKENS);
    expect(theme.typography.fontFamily).toContain('Geist');
    expect(theme.typography.caption.fontFamily).toContain('Geist Mono');
  });

  it('builds the light theme from the legacy light tokens', () => {
    const theme = createAppTheme('light');
    expect(theme.palette.mode).toBe('light');
    expect(theme.palette.background.default).toBe('#eef1f6');
    expect(theme.palette.background.paper).toBe('#ffffff');
    expect(theme.palette.text.primary).toBe('#0f172a');
    expect(theme.palette.divider).toBe('rgba(16,24,40,0.10)');
    expect(theme.palette.crucix).toEqual(LIGHT_TOKENS);
  });

  it('overrides the shell components with panel and glass surfaces', () => {
    const theme = createAppTheme('dark');
    const components = theme.components ?? {};
    const appBar = components.MuiAppBar?.styleOverrides?.root as Record<string, unknown>;
    expect(appBar.backgroundColor).toBe(DARK_TOKENS.glass);
    expect(appBar.border).toBe(`1px solid ${DARK_TOKENS.border}`);
    const paper = components.MuiPaper?.styleOverrides?.root as Record<string, unknown>;
    expect(paper.backgroundColor).toBe(DARK_TOKENS.panel);
    expect(paper.border).toBe(`1px solid ${DARK_TOKENS.border}`);
    for (const name of ['MuiTabs', 'MuiTab', 'MuiButton', 'MuiTextField', 'MuiTooltip', 'MuiDialog', 'MuiChip'] as const) {
      expect(components[name], name).toBeDefined();
    }
    expect(components.MuiButton?.styleOverrides?.root).toMatchObject({ textTransform: 'none' });
  });

  it('emits the legacy CSS custom properties and document rules as global styles', () => {
    const dark = createGlobalStyles(createAppTheme('dark')) as StyleTree;
    expect(dark[':root']).toMatchObject({ '--bg': '#05070b', '--panel': '#0a0d14', '--text': '#e9ecf2' });
    expect(dark['html, body']).toMatchObject({ margin: 0, background: '#05070b' });
    expect(dark['#root']).toMatchObject({ minHeight: '100vh' });
    expect(dark["[data-surface='login']"]).toMatchObject({ '--accent': '#dce2ec' });
    const light = createGlobalStyles(createAppTheme('light')) as StyleTree;
    expect(light[':root']).toMatchObject({ '--bg': '#eef1f6', '--seg-bg': '#e6eaf1' });
  });
});
