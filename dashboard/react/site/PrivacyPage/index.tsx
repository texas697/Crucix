import { P, Strong } from '../components/SiteTags';
import type { PageProps } from '../types';
import { renderPrivacyClosing } from './renders/renderPrivacyClosing';
import { renderPrivacyCollection } from './renders/renderPrivacyCollection';
import { renderPrivacyProcessing } from './renders/renderPrivacyProcessing';
import { renderPrivacyRetention } from './renders/renderPrivacyRetention';
import { renderPrivacyToc } from './renders/renderPrivacyToc';

export function PrivacyPage({ vars }: PageProps) {
  const { appName, operator } = vars;
  return (
    <>
      <P>This Privacy Policy explains how {operator} ("<Strong>we</Strong>", "<Strong>us</Strong>", "<Strong>our</Strong>") collects, uses, shares and protects information when you use the {appName} mobile application for iOS and Android and the online services it connects to (together, the "<Strong>Service</Strong>"). By using the Service you agree to the practices described here. If you do not agree, please do not use the Service.</P>

      {renderPrivacyToc()}
      {renderPrivacyCollection(vars)}
      {renderPrivacyProcessing()}
      {renderPrivacyRetention(vars)}
      {renderPrivacyClosing(vars)}
    </>
  );
}
