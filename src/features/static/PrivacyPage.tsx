import { LegalDocument } from './LegalDocument';

export function PrivacyPage() {
  return <LegalDocument doc="privacy" sections={['collect', 'use', 'sharing', 'security', 'retention', 'rights', 'contact']} />;
}

export default PrivacyPage;
