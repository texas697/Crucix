interface BootWindow {
  __HAS_TAVILY__?: boolean;
  __CRUCIX_LOCALE__?: unknown;
}

function bootWindow(): BootWindow {
  return typeof window !== 'undefined' ? (window as unknown as BootWindow) : {};
}

export function readHasTavily(): boolean {
  return Boolean(bootWindow().__HAS_TAVILY__);
}

export function readLocaleDict(): unknown {
  return bootWindow().__CRUCIX_LOCALE__;
}
