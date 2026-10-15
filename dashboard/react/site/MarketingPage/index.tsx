import { CLASSES } from '../classes';
import { H2, H3, P } from '../components/SiteTags';
import type { PageProps } from '../types';

export function MarketingPage({ vars }: PageProps) {
  const { appName, operator, storeLinks } = vars;
  return (
    <>
      <P className={CLASSES.lead}>The best long-form analysis from think tanks, policy journals and global newsrooms, in one feed and written up for fast reading. Get the gist in a minute, then go as deep as you need.</P>

      {storeLinks}

      <div className={CLASSES.features}>
        <div className={CLASSES.card}>
          <H3>One feed, 30 sources</H3>
          <P>Geopolitics, defense, energy, economics and markets from leading think tanks, research institutes, policy journals and international news desks, refreshed throughout the day.</P>
        </div>
        <div className={CLASSES.card}>
          <H3>AI summaries</H3>
          <P>Open any piece for a concise write-up of its key points and why it matters, so you can decide in seconds whether it's worth the full read. Powered by your own AI key.</P>
        </div>
        <div className={CLASSES.card}>
          <H3>Cited deep dives</H3>
          <P>Want the bigger picture? Start a research brief on any piece and get background and context, where sources disagree, and what to watch next, with inline citations to every source it used.</P>
        </div>
        <div className={CLASSES.card}>
          <H3>A feed that learns</H3>
          <P>Rate pieces thumbs up or down and your feed ranks the topics and sources you value higher. Filter by topic or search across everything.</P>
        </div>
        <div className={CLASSES.card}>
          <H3>Your AI, your key</H3>
          <P>Bring your own key from providers such as Anthropic, OpenAI, Google Gemini, xAI, Mistral or OpenRouter. It's encrypted on our servers and only used for your requests.</P>
        </div>
        <div className={CLASSES.card}>
          <H3>Private by design</H3>
          <P>No ads, no tracking across apps, and we never sell your data. Delete your account and data at any time from Settings.</P>
        </div>
      </div>

      <H2>Who it's for</H2>
      <P>Analysts, investors, policy professionals, journalists, students and anyone who wants to understand what's driving world events without reading thirty websites a day.</P>

      <P className={CLASSES.fine}>{appName} provides information for general purposes only and is not financial or investment advice. AI summaries can contain errors; always check the original source. Publications featured in the feed are independent of {operator} and do not endorse {appName}.</P>
    </>
  );
}
