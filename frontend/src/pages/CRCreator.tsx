import { useEffect, useState } from "react";
import api from "../services/api";
import { useShopStore } from "../stores/shopStore";
import type { CRAIOutput, CRGenerateRequest, CRGenerateResponse, CRProject } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

export default function CRCreator() {
  const { shops, fetchShops, selectedShopId, selectShop } = useShopStore();
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [purpose, setPurpose] = useState<"sales" | "awareness" | "review">("sales");
  const [duration, setDuration] = useState<"15s" | "30s" | "60s">("30s");
  const [tone, setTone] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<CRGenerateResponse | null>(null);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<CRProject[]>([]);

  // Expandable project details
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<CRAIOutput | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchShops();
    api
      .get<CRProject[]>("/cr/projects?limit=10")
      .then((r) => setProjects(r.data))
      .catch(() => {});
  }, [fetchShops]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId) {
      setError("ショップを選択してください。");
      return;
    }

    setError("");
    setGenerating(true);
    setResult(null);

    const req: CRGenerateRequest = {
      shop_id: selectedShopId,
      product_name: productName,
      product_url: productUrl || undefined,
      purpose,
      duration,
      tone: tone || undefined,
      additional_instructions: additionalInstructions || undefined,
    };

    try {
      const { data } = await api.post<CRGenerateResponse>("/cr/generate", req);
      setResult(data);
      const { data: updated } = await api.get<CRProject[]>("/cr/projects?limit=10");
      setProjects(updated);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "生成に失敗しました";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleExpand = async (projectId: string) => {
    if (expandedId === projectId) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }

    // Check if project already has ai_output in list data
    const proj = projects.find((p) => p.id === projectId);
    if (proj?.ai_output) {
      setExpandedId(projectId);
      setExpandedDetail(proj.ai_output);
      return;
    }

    // Fetch detail from API
    setLoadingDetail(true);
    setExpandedId(projectId);
    setExpandedDetail(null);
    try {
      const { data } = await api.get<CRProject>(`/cr/projects/${projectId}`);
      setExpandedDetail(data.ai_output);
    } catch {
      setExpandedDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!window.confirm("このプロジェクトを削除しますか？")) return;
    setDeleting(projectId);
    try {
      await api.delete(`/cr/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (expandedId === projectId) {
        setExpandedId(null);
        setExpandedDetail(null);
      }
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">CR作成</h1>
      <p className="mt-1 text-muted-foreground">
        AIによるTikTok Shop商品のクリエイティブブリーフ自動生成。
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>新規クリエイティブブリーフ</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>ショップ</Label>
                <select
                  value={selectedShopId ?? ""}
                  onChange={(e) => selectShop(e.target.value || null)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="" className="bg-card">ショップを選択...</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id} className="bg-card">{s.shop_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>商品名</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="例: ビタミンC美容液 30ml" required />
              </div>

              <div className="space-y-2">
                <Label>商品URL（任意）</Label>
                <Input type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>目的</Label>
                  <select value={purpose} onChange={(e) => setPurpose(e.target.value as typeof purpose)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="sales" className="bg-card">販売（コンバージョン）</option>
                    <option value="awareness" className="bg-card">認知拡大</option>
                    <option value="review" className="bg-card">商品レビュー</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>動画尺</Label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value as typeof duration)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <option value="15s" className="bg-card">15秒</option>
                    <option value="30s" className="bg-card">30秒</option>
                    <option value="60s" className="bg-card">60秒</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>トーン（任意）</Label>
                <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="例: カジュアル、プロフェッショナル、エネルギッシュ" />
              </div>

              <div className="space-y-2">
                <Label>追加指示（任意）</Label>
                <Textarea value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} rows={3} placeholder="特別な要件やコンテキストなど..." />
              </div>

              <Button type="submit" disabled={generating} className="w-full">
                {generating ? "生成中..." : "クリエイティブブリーフを生成"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {result && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-primary">生成されたクリエイティブブリーフ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Section title="コンセプト" content={result.ai_output.concept} />
                <Separator className="bg-border/30" />
                <Section title="台本" content={result.ai_output.script} />
                {result.ai_output.hooks?.length > 0 && (
                  <>
                    <Separator className="bg-border/30" />
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground">フック候補（最初の3秒）</h3>
                      <div className="mt-2 space-y-2">
                        {result.ai_output.hooks.map((hook, i) => (
                          <div key={i} className="rounded-md bg-card/50 p-3 text-sm text-foreground">
                            <Badge variant="outline" className="mr-2">候補 {i + 1}</Badge>
                            {hook}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <Separator className="bg-border/30" />
                <Section title="CTA" content={result.ai_output.cta} />
                <Section title="備考" content={result.ai_output.notes} />
              </CardContent>
            </Card>
          )}

          {projects.length > 0 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>過去のプロジェクト</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {projects.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border/30 transition-colors">
                    {/* Project header - clickable */}
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 rounded-lg"
                      onClick={() => handleToggleExpand(p.id)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedId === p.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.product_name}</p>
                          <p className="text-xs text-muted-foreground">{p.purpose} / {p.duration} / {new Date(p.created_at).toLocaleDateString("ja-JP")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={p.status === "generated" ? "default" : "secondary"}>
                          {p.status === "generated" ? "生成済み" : p.status === "draft" ? "下書き" : p.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id);
                          }}
                          disabled={deleting === p.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {expandedId === p.id && (
                      <div className="border-t border-border/30 px-4 py-3 space-y-3 bg-accent/20 rounded-b-lg">
                        {loadingDetail ? (
                          <p className="text-sm text-muted-foreground animate-pulse">読み込み中...</p>
                        ) : expandedDetail ? (
                          <>
                            <Section title="コンセプト" content={expandedDetail.concept} />
                            <Separator className="bg-border/20" />
                            <Section title="台本" content={expandedDetail.script} />
                            {expandedDetail.hooks?.length > 0 && (
                              <>
                                <Separator className="bg-border/20" />
                                <div>
                                  <h3 className="text-sm font-semibold text-muted-foreground">フック候補</h3>
                                  <div className="mt-1 space-y-1">
                                    {expandedDetail.hooks.map((hook, i) => (
                                      <div key={i} className="rounded-md bg-card/50 p-2 text-sm text-foreground">
                                        <Badge variant="outline" className="mr-2 text-xs">候補 {i + 1}</Badge>
                                        {hook}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                            <Separator className="bg-border/20" />
                            <Section title="CTA" content={expandedDetail.cta} />
                            <Section title="備考" content={expandedDetail.notes} />
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">ブリーフデータがありません。</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{content}</p>
    </div>
  );
}
