"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { sendFamilyMessageAction } from "@/app/chat-actions";

export type ChatMessage = {
  id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
};

function messageTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function FamilyChat({ initialMessages, currentMemberId }: { initialMessages: ChatMessage[]; currentMemberId: string }) {
  const [messages, setMessages] = useState(initialMessages);
  const [state, formAction, pending] = useActionState(sendFamilyMessageAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const latestMessageId = messages.at(-1)?.id;

  const refreshMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/chat", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json() as { messages: ChatMessage[] };
      setMessages(payload.messages);
    } catch {
      // Keep the last successfully loaded conversation visible while offline.
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, []);

  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    const timer = window.setTimeout(() => void refreshMessages(), 0);
    return () => window.clearTimeout(timer);
  }, [state, refreshMessages]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshMessages();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [refreshMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [latestMessageId]);

  return <section className="chat-card" aria-label="Family conversation">
    <div className="chat-list" aria-live="polite">
      {messages.length ? messages.map((message) => {
        const own = message.sender_id === currentMemberId;
        return <article className={`chat-message ${own ? "own" : ""}`} key={message.id}>
          <div className="chat-message-meta">
            <strong>{own ? "You" : message.sender_name}</strong>
            <time dateTime={message.created_at}>{messageTime(message.created_at)}</time>
          </div>
          <p>{message.body}</p>
        </article>;
      }) : <div className="chat-empty"><strong>Start the family conversation</strong><span>Messages shared here are visible only to members of your family space.</span></div>}
      <div ref={endRef} />
    </div>
    <form action={formAction} className="chat-composer" ref={formRef}>
      <label className="sr-only" htmlFor="family-message">Message your family</label>
      <textarea id="family-message" name="body" maxLength={1000} placeholder="Write a message to your family…" required rows={2} />
      <button className="button button-primary" disabled={pending} type="submit">
        {pending ? <LoaderCircle size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
        {pending ? "Sending" : "Send"}
      </button>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  </section>;
}
