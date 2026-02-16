import { useEffect, useState } from "react";
import api from "../services/api";
import { useShopStore } from "../stores/shopStore";
import type { CRGenerateRequest, CRGenerateResponse, CRProject } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
              <CardContent className="space-y-3">
                {projects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/30 p-3 transition-colors hover:bg-accent/50">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.product_name}</p>
                      <p className="text-xs text-muted-foreground">{p.purpose} / {p.duration} / {new Date(p.created_at).toLocaleDateString("ja-JP")}</p>
                    </div>
                    <Badge variant={p.status === "generated" ? "default" : "secondary"}>
                      {p.status === "generated" ? "生成済み" : p.status === "draft" ? "下書き" : p.status}
                    </Badge>
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
