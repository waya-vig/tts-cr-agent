import { useEffect, useState } from "react";
import api from "../services/api";
import type { TrendProduct } from "../types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "trends" | "hidden-gems";

export default function MarketIntelligence() {
  const [tab, setTab] = useState<Tab>("trends");
  const [products, setProducts] = useState<TrendProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [market, setMarket] = useState("");

  useEffect(() => {
    fetchData();
  }, [tab, market]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (market) params.set("market", market);
      const { data } = await api.get<TrendProduct[]>(`/market/${tab}?${params.toString()}`);
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (<Skeleton key={i} className="h-12 w-full" />))}
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-border/50 p-12 text-center">
          <p className="text-muted-foreground">データがありません。データパイプラインが接続されると、ここに市場データが表示されます。</p>
        </div>
      );
    }

    return (
      <Card className="border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead>商品名</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead className="text-right">販売数</TableHead>
              <TableHead className="text-right">売上</TableHead>
              <TableHead className="text-right">成長率</TableHead>
              <TableHead className="text-right">競合度</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id} className="border-border/50">
                <TableCell className="font-medium">{p.product_name}</TableCell>
                <TableCell className="text-muted-foreground">{p.category ?? "--"}</TableCell>
                <TableCell className="text-right text-muted-foreground">{p.sold_count?.toLocaleString() ?? "--"}</TableCell>
                <TableCell className="text-right text-muted-foreground">{p.revenue != null ? `$${p.revenue.toLocaleString()}` : "--"}</TableCell>
                <TableCell className="text-right">
                  {p.growth_rate != null ? (
                    <span className={p.growth_rate > 0 ? "text-emerald-400" : "text-red-400"}>
                      {p.growth_rate > 0 ? "+" : ""}{(p.growth_rate * 100).toFixed(1)}%
                    </span>
                  ) : "--"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{p.competition_score != null ? `${(p.competition_score * 100).toFixed(0)}%` : "--"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">市場分析</h1>
      <p className="mt-1 text-muted-foreground">トレンド商品、競合分析、マーケットインサイト。</p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mt-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="trends">トレンド商品</TabsTrigger>
            <TabsTrigger value="hidden-gems">穴場商品</TabsTrigger>
          </TabsList>
          <select value={market} onChange={(e) => setMarket(e.target.value)} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="" className="bg-card">全マーケット</option>
            <option value="US" className="bg-card">アメリカ</option>
            <option value="UK" className="bg-card">イギリス</option>
            <option value="ID" className="bg-card">インドネシア</option>
            <option value="TH" className="bg-card">タイ</option>
            <option value="MY" className="bg-card">マレーシア</option>
            <option value="VN" className="bg-card">ベトナム</option>
            <option value="PH" className="bg-card">フィリピン</option>
          </select>
        </div>
        <TabsContent value="trends" className="mt-6">{renderTable()}</TabsContent>
        <TabsContent value="hidden-gems" className="mt-6">{renderTable()}</TabsContent>
      </Tabs>
    </div>
  );
}
