import type { ReactNode } from 'react';
import { CLASSES } from '../../classes';
import { A, Li, Ol } from '../../components/SiteTags';

export function renderTermsToc(): ReactNode {
  return (
    <>
      <div className={CLASSES.toc}><Ol>
        <Li><A href="#eligibility">Eligibility</A></Li>
        <Li><A href="#account">Your account</A></Li>
        <Li><A href="#service">The Service</A></Li>
        <Li><A href="#license">License to use the Service</A></Li>
        <Li><A href="#acceptable-use">Acceptable use</A></Li>
        <Li><A href="#no-advice">No financial or investment advice</A></Li>
        <Li><A href="#information">Third-party data, AI output and accuracy</A></Li>
        <Li><A href="#byok">Your own AI provider key</A></Li>
        <Li><A href="#ip">Intellectual property and feedback</A></Li>
        <Li><A href="#purchases">Purchases</A></Li>
        <Li><A href="#termination">Suspension and termination</A></Li>
        <Li><A href="#disclaimers">Disclaimers</A></Li>
        <Li><A href="#liability">Limitation of liability and indemnity</A></Li>
        <Li><A href="#disputes">Governing law and disputes</A></Li>
        <Li><A href="#app-stores">App store terms</A></Li>
        <Li><A href="#general">General</A></Li>
        <Li><A href="#contact">Contact us</A></Li>
      </Ol></div>
    </>
  );
}
