import { readPublicLegalDoc } from "@/lib/legal/read-doc";
import { LegalDocPage } from "@/components/legal/LegalDocPage";

export default function TermsPage() {
  return <LegalDocPage doc={readPublicLegalDoc("02-terms-of-service.md")} />;
}
