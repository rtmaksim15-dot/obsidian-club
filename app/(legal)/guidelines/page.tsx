import { readPublicLegalDoc } from "@/lib/legal/read-doc";
import { LegalDocPage } from "@/components/legal/LegalDocPage";

export default function GuidelinesPage() {
  return <LegalDocPage doc={readPublicLegalDoc("04-acceptable-use-policy.md")} />;
}
