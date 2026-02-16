import { useEffect, useState } from "react";
import api from "../services/api";
import { useShopStore } from "../stores/shopStore";
import type { CRProject } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  generating: "生成中",
  generated: "生成済み",
  filming: "撮影中",
  published: "公開済み",
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    draft: "secondary",
    generating: "outline",
    generated: "default",
    filming: "outline",
    published: "default",
  };
  return (
    <Badge variant={variants[status] ?? "secondary"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export default function Dashboard() {
  const { shops, fetchShops } = useShopStore();
  const [projects, setProjects] = useState<CRProject[]>([]);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      await fetchShops();
      try {
        const [pRes, kRes] = await Promise.all([
          api.get<CRProject[]>("/cr/projects?limit=5"),
          api.get<{ id: string }[]>("/knowledge/"),
        ]);
        setProjects(pRes.data);
        setKnowledgeCount(kRes.data.length);
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchShops]);

  const stats = [
    { label: "アクティブショップ", value: shops.filter((s) => s.is_active).length },
    { label: "CRプロジェクト", value: projects.length },
    { label: "ナレッジ数", value: knowledgeCount },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">ダッシュボード</h1>
      <p className="mt-1 text-muted-foreground">
        TikTok Shopの運用状況を確認できます。
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardHeader className="pb-2">
              <CardDescription className="text-sm font-medium">
                {stat.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl font-semibold text-foreground">
                  {stat.value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-border/50">
        <CardHeader>
          <CardTitle>最近のCRプロジェクト</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              まだプロジェクトがありません。CR作成から始めましょう。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead>商品名</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>動画尺</TableHead>
                  <TableHead>作成日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id} className="border-border/50">
                    <TableCell className="font-medium">{p.product_name}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.duration ?? "--"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("ja-JP")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {shops.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">登録ショップ</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => (
              <Card key={shop.id} className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">{shop.shop_name}</h3>
                    <Badge variant={shop.is_active ? "default" : "secondary"}>
                      {shop.is_active ? "有効" : "無効"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {shop.market ?? "マーケット未設定"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
