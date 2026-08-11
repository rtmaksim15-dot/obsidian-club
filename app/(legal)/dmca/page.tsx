import { readPublicLegalDoc } from "@/lib/legal/read-doc";
import { LegalDocPage } from "@/components/legal/LegalDocPage";

export default function DmcaPage() {
  return <LegalDocPage doc={readPublicLegalDoc("06-dmca-policy.md")} />;
}
