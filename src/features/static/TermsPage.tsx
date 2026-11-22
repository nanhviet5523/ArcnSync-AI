import { LegalDocument } from './LegalDocument';

export function TermsPage() {
  return <LegalDocument doc="terms" sections={['acceptance', 'accounts', 'ip', 'responsibilities', 'payments', 'liability', 'changes']} />;
}

export default TermsPage;
