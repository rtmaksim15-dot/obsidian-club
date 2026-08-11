import { readPublicLegalDoc } from "@/lib/legal/read-doc";
import { LegalDocPage } from "@/components/legal/LegalDocPage";

export default function PrivacyPage() {
  return <LegalDocPage doc={readPublicLegalDoc("03-privacy-policy.md")} />;
}
