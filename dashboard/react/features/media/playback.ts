export function safePlay(video: HTMLMediaElement): void {
  try {
    const result = video.play();
    if (result && typeof result.catch === 'function') void result.catch(() => undefined);
  } catch {
    return;
  }
}

export function safeLoad(video: HTMLMediaElement): void {
  try {
    video.load();
  } catch {
    return;
  }
}

export function canPlayHlsNatively(video: HTMLMediaElement): boolean {
  try {
    return typeof video.canPlayType === 'function'
      && video.canPlayType('application/vnd.apple.mpegurl') !== '';
  } catch {
    return false;
  }
}
