import { useRef, useState } from "react";
import api from "../services/api";
import type { CopilotMessage } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";

export default function Copilot() {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      const apiBase = import.meta.env.VITE_API_URL || "/api/v1";
      const response = await fetch(`${apiBase}/copilot/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ message: input, history: messages.slice(-10) }),
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
              assistantContent += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            } else if (data.type === "sources") {
              setSources(data.sources);
            }
          } catch { /* skip parse errors */ }
        }
      }
      scrollToBottom();
    } catch {
      try {
        const { data } = await api.post("/copilot/chat", { message: input, history: messages.slice(-10) });
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
        setSources(data.sources ?? []);
      } catch {
        setMessages([...newMessages, { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" }]);
      }
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">AIチャット</h1>
        <p className="mt-1 text-muted-foreground">CR制作、マーケットトレンド、TikTok Shop戦略について何でも聞いてください。</p>
      </div>

      <ScrollArea className="flex-1 rounded-lg border border-border/50 bg-card/50 p-4">
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

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-4 py-3">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.2s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {sources.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground/60">参照元:</span>
          {sources.map((s, i) => (<Badge key={i} variant="outline" className="text-xs">{s}</Badge>))}
        </div>
      )}

      <form onSubmit={handleSend} className="mt-4 flex gap-3">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="何でも聞いてください..." disabled={loading} className="flex-1" />
        <Button type="submit" disabled={loading || !input.trim()} size="icon"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
