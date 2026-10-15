import type { MediaChannel } from './types';

export const CHANNELS: readonly MediaChannel[] = [
  {
    id: 'aljazeera', name: 'Al Jazeera English', region: 'Qatar', color: '#f5c542',
    hls: 'https://live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8',
    yt: 'https://www.youtube.com/watch?v=gCNeDWCI0vo',
    page: 'https://www.aljazeera.com/live',
  },
  {
    id: 'rt', name: 'RT', region: 'Russia', color: '#7fe0c0',
    hls: 'https://rt-glb.rttv.com/dvr/rtnews/playlist.m3u8',
    page: 'https://www.rt.com/on-air/',
  },
  {
    id: 'presstv', name: 'Press TV', region: 'Iran (English)', color: '#6aa8ff',
    hls: 'https://live.presstv.co.uk/hls/presstv.m3u8',
    page: 'https://www.presstv.ir/',
  },
  {
    id: 'iranintl', name: 'Iran International', region: 'Iran (English)', color: '#b48cff',
    hls: 'https://live.livetvstream.co.uk/LS-63503-4/index.m3u8',
    yt: 'https://www.youtube.com/watch?v=5JDxjsAVaGk',
    page: 'https://www.iranintl.com/live',
  },
  {
    id: 'dw', name: 'DW English', region: 'Germany', color: '#8fb8d8',
    hls: 'https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/master.m3u8',
    page: 'https://www.dw.com/en/live-tv/channel-english',
  },
  {
    id: 'france24', name: 'France 24 English', region: 'France', color: '#8fb8d8',
    hls: 'https://amg00106-france24-france24-samsunguk-qvpp8.amagi.tv/playlist/amg00106-france24-france24-samsunguk/playlist.m3u8',
    page: 'https://www.france24.com/en/live',
  },
];

export const DEFAULT_CHANNEL = CHANNELS[0] as MediaChannel;

export const CHANNEL_COUNT = CHANNELS.length;

export const GRID_CHANNELS = CHANNELS.slice(0, 4);

export function channelAt(index: number): MediaChannel {
  return CHANNELS[index] ?? DEFAULT_CHANNEL;
}

export function channelIndexFor(id: string | undefined): number {
  return CHANNELS.findIndex((c) => c.id === id);
}
