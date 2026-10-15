import type { ReactNode } from 'react';
import { CLASSES } from '../../classes';
import { A, Li, Ol } from '../../components/SiteTags';

export function renderPrivacyToc(): ReactNode {
  return (
    <>
      <div className={CLASSES.toc}><Ol>
        <Li><A href="#summary">Summary</A></Li>
        <Li><A href="#collect">Information we collect</A></Li>
        <Li><A href="#not-collect">Information we do not collect</A></Li>
        <Li><A href="#use">How we use information</A></Li>
        <Li><A href="#share">How we share information</A></Li>
        <Li><A href="#ai">AI features and your own API key</A></Li>
        <Li><A href="#retention">Data retention</A></Li>
        <Li><A href="#delete-account">Deleting your account and data</A></Li>
        <Li><A href="#rights">Your privacy rights</A></Li>
        <Li><A href="#security">Security</A></Li>
        <Li><A href="#transfers">International transfers</A></Li>
        <Li><A href="#children">Children</A></Li>
        <Li><A href="#changes">Changes to this policy</A></Li>
        <Li><A href="#contact">Contact us</A></Li>
      </Ol></div>
    </>
  );
}
