import { MessageCircleMore } from "lucide-react";
import { FamilyChat, type ChatMessage } from "@/components/family-chat";
import { PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth/session";
import { getFamilyMessages } from "@/lib/chat/data";

export const metadata = { title: "Family chat" };

export default async function ChatPage() {
  const session = await requireSession();
  const messages = await getFamilyMessages(session);
  const serialized: ChatMessage[] = messages.map((message) => ({
    ...message,
    created_at: message.created_at.toISOString(),
  }));

  return <>
    <PageHeader
      title="Family chat"
      intro="A private conversation shared only with the people in your family space."
      action={<span className="status-pill"><MessageCircleMore size={16} />Updates automatically</span>}
    />
    <FamilyChat initialMessages={serialized} currentMemberId={session.memberId} />
  </>;
}
