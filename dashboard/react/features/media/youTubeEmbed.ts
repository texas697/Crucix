export function youTubeEmbed(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/[?&]v=([\w-]{6,})/) || url.match(/youtu\.be\/([\w-]{6,})/);
  const id = m?.[1];
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url.replace('/watch', '/embed');
}
