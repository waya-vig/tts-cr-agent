import { useEffect, useState } from "react";
import api from "../services/api";
import type { KnowledgeEntry } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "", label: "すべて" },
  { value: "hook", label: "フック" },
  { value: "script", label: "台本" },
  { value: "trend", label: "トレンド" },
  { value: "strategy", label: "戦略" },
  { value: "product", label: "商品" },
];

export default function KnowledgeManager() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchEntries(); }, [filter]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("category", filter);
      const { data } = await api.get<KnowledgeEntry[]>(`/knowledge/?${params.toString()}`);
      setEntries(data);
    } catch { setEntries([]); } finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/knowledge/", { title, content, category: category || null, source: source || null });
      setTitle(""); setContent(""); setCategory(""); setSource(""); setShowForm(false); fetchEntries();
    } catch { /* silently handle */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/knowledge/${id}`); setEntries((prev) => prev.filter((e) => e.id !== id)); } catch { /* silently handle */ }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ナレッジ管理</h1>
          <p className="mt-1 text-muted-foreground">AI生成の品質向上のためのナレッジベースを管理します。</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
          {showForm ? "キャンセル" : "+ エントリー追加"}
        </Button>
      </div>

      {showForm && (
        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>タイトル</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>カテゴリ</Label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      <option value="" className="bg-card">なし</option>
                      <option value="hook" className="bg-card">フック</option>
                      <option value="script" className="bg-card">台本</option>
                      <option value="trend" className="bg-card">トレンド</option>
                      <option value="strategy" className="bg-card">戦略</option>
                      <option value="product" className="bg-card">商品</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>ソース</Label>
                    <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="任意" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>内容</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} required />
              </div>
              <Button type="submit" disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex gap-2">
        {CATEGORIES.map((cat) => (
          <Badge key={cat.value} variant={filter === cat.value ? "default" : "secondary"} className={cn("cursor-pointer transition-colors", filter !== cat.value && "hover:bg-accent")} onClick={() => setFilter(cat.value)}>
            {cat.label}
          </Badge>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-24 w-full" />))}</div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/50 p-12 text-center">
            <p className="text-muted-foreground">ナレッジエントリーがまだありません。最初のエントリーを追加して、AI生成の品質を向上させましょう。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="border-border/50 transition-colors hover:border-border">
                <CardContent className="flex items-start justify-between p-5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{entry.title}</h3>
                      {entry.category && <Badge variant="outline">{entry.category}</Badge>}
                      {entry.performance_score != null && <Badge variant="secondary">スコア: {entry.performance_score}</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{entry.content}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground/60">
                      {entry.source && <span>ソース: {entry.source}</span>}
                      <span>{new Date(entry.created_at).toLocaleDateString("ja-JP")}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(entry.id)}>削除</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
