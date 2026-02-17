import { useEffect, useRef, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import api from "../services/api";
import type { Conversation, CopilotMessage } from "../types";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Send, Trash2 } from "lucide-react";

/** Close any unclosed markdown tokens so partial streams render correctly */
function sanitizePartialMarkdown(text: string): string {
  // Close unclosed bold/italic
  const boldCount = (text.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) text += "**";
  const italicCount = (text.match(/(?<!\*)\*(?!\*)/g) || []).length;
  if (italicCount % 2 !== 0) text += "*";
  // Close unclosed backticks
  const codeBlockCount = (text.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) text += "\n```";
  const inlineCodeCount = (text.match(/(?<!`)`(?!`)/g) || []).length;
  if (inlineCodeCount % 2 !== 0) text += "`";
  return text;
}

export default function Copilot() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Lock parent <main> scroll while Copilot is mounted
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const prev = main.style.overflow;
    main.style.overflow = "hidden";
    return () => { main.style.overflow = prev; };
  }, []);

  // Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const { data } = await api.get("/copilot/conversations");
      setConversations(data);
    } catch { /* ignore */ }
  };

  const loadConversation = async (convId: string) => {
    try {
      const { data } = await api.get(`/copilot/conversations/${convId}`);
      setActiveConvId(convId);
      setMessages(data.messages);
      setSources([]);
      setTimeout(scrollToBottom, 100);
    } catch { /* ignore */ }
  };

  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setSources([]);
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/copilot/conversations/${convId}`);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        startNewChat();
      }
    } catch { /* ignore */ }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: CopilotMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setSources([]);

    try {
      const apiBase = import.meta.env.DEV ? "/api/v1" : "https://tts-cr-agent-api.onrender.com/api/v1";
      const response = await fetch(`${apiBase}/copilot/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          message: input,
          history: messages.slice(-10),
          conversation_id: activeConvId,
        }),
      });

      if (!response.ok) throw new Error("Stream failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantContent = "";
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              if (!assistantContent) setStreaming(true);
              assistantContent += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
              scrollToBottom();
            } else if (data.type === "sources") {
              setSources(data.sources);
            } else if (data.type === "conversation_id") {
              setActiveConvId(data.conversation_id);
            }
          } catch { /* skip parse errors */ }
        }
      }
      // Refresh conversation list after message
      loadConversations();
      scrollToBottom();
    } catch {
      try {
        const { data } = await api.post("/copilot/chat", {
          message: input,
          history: messages.slice(-10),
          conversation_id: activeConvId,
        });
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
        setSources(data.sources ?? []);
        setActiveConvId(data.conversation_id);
        loadConversations();
      } catch {
        setMessages([...newMessages, { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" }]);
      }
    } finally {
      setLoading(false);
      setStreaming(false);
      scrollToBottom();
    }
  };

  return (
    <div className="absolute inset-0 flex">
      {/* ── Left Sidebar: Conversation List ── */}
      <div className="flex w-64 shrink-0 flex-col border-r border-border/50 bg-card/30">
        <div className="p-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={startNewChat}>
            <MessageSquarePlus className="h-4 w-4" />
            新規チャット
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <div className="space-y-1 pb-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`group flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${
                  activeConvId === conv.id ? "bg-muted text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="truncate">{conv.title}</span>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="ml-1 hidden shrink-0 rounded p-1 hover:bg-destructive/20 hover:text-destructive group-hover:block"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground/40">まだ会話がありません</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 shrink-0">
          <h1 className="text-2xl font-bold text-foreground">AIチャット</h1>
          <p className="mt-1 text-muted-foreground">CR制作、マーケットトレンド、TikTok Shop戦略について何でも聞いてください。</p>
        </div>

        {/* Chat messages - scrollable area */}
        <div ref={chatContainerRef} className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border/50 bg-card/50 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full min-h-[300px] items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-muted-foreground/60">会話を始めましょう</p>
                  <p className="mt-1 text-sm text-muted-foreground/40">CRのベストプラクティス、マーケットトレンド、TikTok Shop戦略についてお気軽にどうぞ。</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {["美容系商品に効果的なフックは？", "動画のCTRを改善するには？", "USマーケットのトレンドカテゴリは？"].map((q) => (
                      <Button key={q} variant="outline" size="sm" className="rounded-full text-xs" onClick={() => setInput(q)}>{q}</Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const isLastMsg = i === messages.length - 1;
              const displayContent = (isLastMsg && streaming) ? sanitizePartialMarkdown(msg.content) : msg.content;
              return (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {msg.role === "user" ? (
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{displayContent}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && !streaming && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0.2s]" />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0.4s]" />
                    </div>
                    <span className="text-xs text-muted-foreground/60">考えています...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSend} className="mt-4 flex items-end gap-3 shrink-0">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize
              const ta = e.target;
              ta.style.height = "auto";
              ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="何でも聞いてください...（Shift+Enterで改行）"
            disabled={loading}
            rows={1}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button type="submit" disabled={loading || !input.trim()} size="icon" className="shrink-0"><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
}
