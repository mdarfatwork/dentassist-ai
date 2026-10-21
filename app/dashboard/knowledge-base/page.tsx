import { KnowledgeManager } from "@/components/knowledge/knowledge-manager";

export const metadata = {
  title: "Knowledge Base | DentAssist AI",
  description:
    "Clinic knowledge documents, FAQs, dental clinical protocols, and AI receptionist grounding context.",
};

export default function KnowledgeBasePage() {
  return <KnowledgeManager />;
}
