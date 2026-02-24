import { useEffect, useState } from "react";
import api from "../services/api";
import type {
  FastMossCreator,
  FastMossCreatorResponse,
  FastMossProduct,
  FastMossProductResponse,
  FastMossVideo,
  FastMossVideoResponse,
} from "../types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Play,
  Search,
  X,
} from "lucide-react";

type Tab = "products" | "creators";

const REGIONS = [
  { value: "JP", label: "日本" },
  { value: "US", label: "アメリカ" },
  { value: "GB", label: "イギリス" },
  { value: "ID", label: "インドネシア" },
  { value: "TH", label: "タイ" },
  { value: "MY", label: "マレーシア" },
  { value: "VN", label: "ベトナム" },
  { value: "PH", label: "フィリピン" },
  { value: "MX", label: "メキシコ" },
  { value: "BR", label: "ブラジル" },
  { value: "DE", label: "ドイツ" },
  { value: "FR", label: "フランス" },
  { value: "IT", label: "イタリア" },
  { value: "ES", label: "スペイン" },
  { value: "SG", label: "シンガポール" },
];

function formatNumber(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (num == null || isNaN(num) || num === 0) return "--";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatCurrency(
  n: number | string | null | undefined,
  unit = "$"
): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (num == null || isNaN(num) || num === 0) return "--";
  if (num >= 1_000_000_000) return `${unit}${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${unit}${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${unit}${(num / 1_000).toFixed(1)}K`;
  return `${unit}${num.toLocaleString()}`;
}

function getCurrencyUnit(region: string): string {
  const map: Record<string, string> = {
    JP: "¥",
    US: "$",
    GB: "£",
    DE: "€",
    FR: "€",
    IT: "€",
    ES: "€",
  };
  return map[region] || "$";
}

export default function MarketIntelligence() {
  const [tab, setTab] = useState<Tab>("products");
  const [region, setRegion] = useState("JP");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Products
  const [products, setProducts] = useState<FastMossProduct[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productSort, setProductSort] = useState("day7_units_sold");
  const [keywords, setKeywords] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Creators
  const [creators, setCreators] = useState<FastMossCreator[]>([]);
  const [creatorsTotal, setCreatorsTotal] = useState(0);

  // Product detail modal
  const [selectedProduct, setSelectedProduct] =
    useState<FastMossProduct | null>(null);
  const [videos, setVideos] = useState<FastMossVideo[]>([]);
  const [videosTotal, setVideosTotal] = useState(0);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosPage, setVideosPage] = useState(1);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [tab, region, productSort, keywords]);

  // Fetch data
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, region, page, productSort, keywords]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === "products") {
        const { data } = await api.get<FastMossProductResponse>(
          "/fastmoss/products",
          {
            params: {
              region,
              page,
              page_size: 10,
              sort_by: productSort,
              keywords,
            },
          }
        );
        setProducts(data.products);
        setProductsTotal(data.total);
      } else if (tab === "creators") {
        const { data } = await api.get<FastMossCreatorResponse>(
          "/fastmoss/creators/ranking",
          {
            params: { region, page, page_size: 10, date_type: "week" },
          }
        );
        setCreators(data.creators);
        setCreatorsTotal(data.total);
      }
    } catch {
      if (tab === "products") {
        setProducts([]);
        setProductsTotal(0);
      }
      if (tab === "creators") {
        setCreators([]);
        setCreatorsTotal(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch product videos
  const openProductDetail = async (product: FastMossProduct) => {
    setSelectedProduct(product);
    setVideosPage(1);
    setVideosLoading(true);
    setVideos([]);
    try {
      const { data } = await api.get<FastMossVideoResponse>(
        `/fastmoss/products/${product.product_id}/videos`,
        { params: { date_type: 7, page: 1, page_size: 10 } }
      );
      setVideos(data.videos);
      setVideosTotal(data.total);
    } catch {
      setVideos([]);
      setVideosTotal(0);
    } finally {
      setVideosLoading(false);
    }
  };

  const loadMoreVideos = async () => {
    if (!selectedProduct) return;
    const nextPage = videosPage + 1;
    setVideosLoading(true);
    try {
      const { data } = await api.get<FastMossVideoResponse>(
        `/fastmoss/products/${selectedProduct.product_id}/videos`,
        { params: { date_type: 7, page: nextPage, page_size: 10 } }
      );
      setVideos((prev) => [...prev, ...data.videos]);
      setVideosPage(nextPage);
    } catch {
      // silent
    } finally {
      setVideosLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeywords(searchInput);
  };

  const renderSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );

  const PAGE_SIZE = 10;
  const renderPagination = (total: number) => {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) return null;
    return (
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} 件中{" "}
          {((page - 1) * PAGE_SIZE + 1).toLocaleString()}〜
          {Math.min(page * PAGE_SIZE, total).toLocaleString()} 件
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {Math.min(totalPages, 250)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.min(totalPages, 250)}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderEmpty = () => (
    <div className="rounded-lg border border-dashed border-border/50 p-12 text-center">
      <p className="text-muted-foreground">
        データがありません。FastMoss APIキーが未設定、またはデータが見つかりませんでした。
      </p>
    </div>
  );

  // --- Products tab ---
  const renderProducts = () => {
    if (loading) return renderSkeleton();
    if (products.length === 0) return renderEmpty();

    return (
      <>
        <Card className="border-border/50 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-16">画像</TableHead>
                <TableHead>商品名</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead className="text-right">価格</TableHead>
                <TableHead className="text-right">7日間販売</TableHead>
                <TableHead className="text-right">総販売数</TableHead>
                <TableHead className="text-right">総売上</TableHead>
                <TableHead className="text-right">手数料率</TableHead>
                <TableHead className="text-right">CR数</TableHead>
                <TableHead className="text-right">動画数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p, i) => (
                <TableRow
                  key={p.product_id}
                  className="border-border/50 cursor-pointer hover:bg-accent/50"
                  onClick={() => openProductDetail(p)}
                >
                  <TableCell className="text-muted-foreground">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </TableCell>
                  <TableCell>
                    {p.image ? (
                      <img
                        src={p.image}
                        alt=""
                        className="h-12 w-12 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground text-xs">No img</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <span className="font-medium line-clamp-2 max-w-[280px] block">
                        {p.title}
                      </span>
                      {p.product_rating > 0 && (
                        <span className="text-xs text-yellow-500 mt-0.5">★ {p.product_rating}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {p.category_name || "--"}
                  </TableCell>
                  <TableCell className="text-right">{p.price || "--"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatNumber(p.day7_units_sold)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatNumber(p.total_units_sold)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-400">
                    {formatCurrency(p.total_gmv, getCurrencyUnit(region))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {p.commission_rate && !isNaN(Number(p.commission_rate)) && Number(p.commission_rate) > 0
                      ? `${Number(p.commission_rate)}%`
                      : "--"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatNumber(p.creator_count)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatNumber(p.video_count)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        {renderPagination(productsTotal)}
      </>
    );
  };

  // --- Creators tab ---
  const renderCreators = () => {
    if (loading) return renderSkeleton();
    if (creators.length === 0) return renderEmpty();

    return (
      <>
        <Card className="border-border/50 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-12">#</TableHead>
                <TableHead>クリエイター</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead className="text-right">フォロワー</TableHead>
                <TableHead className="text-right">販売商品数</TableHead>
                <TableHead className="text-right">売上（GMV）</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creators.map((c, i) => (
                <TableRow key={c.uid} className="border-border/50">
                  <TableCell className="text-muted-foreground font-medium">
                    {c.rank || (page - 1) * PAGE_SIZE + i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {c.avatar && (
                        <img
                          src={c.avatar}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover shrink-0"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm">{c.nickname}</p>
                        <p className="text-xs text-muted-foreground">
                          @{c.unique_id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {c.category?.length > 0 ? c.category.join(", ") : "--"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatNumber(c.follower_count)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatNumber(c.product_count)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-400">
                    {formatCurrency(c.total_gmv, getCurrencyUnit(c.region || region))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        {renderPagination(creatorsTotal)}
      </>
    );
  };

  // --- Product Detail Modal ---
  const renderProductDetail = () => {
    if (!selectedProduct) return null;
    const p = selectedProduct;

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto p-4">
        <div className="relative mt-8 mb-8 w-full max-w-4xl rounded-xl border border-border/50 bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border/30 p-5">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {p.image ? (
                <img
                  src={p.image}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <span className="text-muted-foreground text-xs">No image</span>
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-foreground">{p.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {p.category_name || "カテゴリ不明"}
                  {p.product_rating > 0 && <span className="ml-2 text-yellow-500">★ {p.product_rating}</span>}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{p.price || "価格不明"}</Badge>
                  {p.commission_rate && !isNaN(Number(p.commission_rate)) && Number(p.commission_rate) > 0 && (
                    <Badge variant="secondary">
                      手数料 {Number(p.commission_rate)}%
                    </Badge>
                  )}
                  <Badge variant="secondary">{REGIONS.find((r) => r.value === p.region)?.label || p.region}</Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                setSelectedProduct(null);
                setVideos([]);
                setVideosTotal(0);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 border-b border-border/30 p-5 sm:grid-cols-5">
            <StatCard label="7日間販売数" value={formatNumber(p.day7_units_sold)} />
            <StatCard
              label="総売上（GMV）"
              value={formatCurrency(p.total_gmv, getCurrencyUnit(p.region || region))}
              color="text-emerald-400"
            />
            <StatCard label="総販売数" value={formatNumber(p.total_units_sold)} />
            <StatCard label="関連CR" value={formatNumber(p.creator_count)} />
            <StatCard label="動画数" value={formatNumber(p.video_count)} />
          </div>

          {/* Videos */}
          <div className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              関連動画{" "}
              {videosTotal > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({videosTotal.toLocaleString()}件)
                </span>
              )}
            </h3>

            {videosLoading && videos.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                関連動画が見つかりませんでした。
              </p>
            ) : (
              <div className="space-y-3">
                {videos.map((v) => (
                  <div
                    key={v.video_id}
                    className="flex gap-3 rounded-lg border border-border/30 p-3 hover:bg-accent/30 transition-colors"
                  >
                    {/* Video thumbnail */}
                    <div className="relative shrink-0">
                      {v.cover ? (
                        <img
                          src={v.cover}
                          alt=""
                          className="h-20 w-14 rounded object-cover"
                        />
                      ) : (
                        <div className="h-20 w-14 rounded bg-muted flex items-center justify-center">
                          <Play className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      {v.duration && v.duration !== "0" && (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] text-white">
                          {parseInt(v.duration)}s
                        </span>
                      )}
                    </div>

                    {/* Video info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2">
                        {v.description || "（説明なし）"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatNumber(v.play_count)} 再生</span>
                        <span>{formatNumber(v.digg_count)} いいね</span>
                        <span>{formatNumber(v.comment_count)} コメント</span>
                        <span>{formatNumber(v.sold_count)} 販売</span>
                        {v.sale_amount && v.sale_amount !== "0" && (
                          <span className="text-emerald-400">
                            {formatCurrency(v.sale_amount)} 売上
                          </span>
                        )}
                        {v.create_date && <span>{v.create_date}</span>}
                        {v.is_ad === "1" && (
                          <Badge variant="outline" className="text-[10px] h-4">
                            広告
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Links */}
                    <div className="flex flex-col gap-1 shrink-0">
                      {v.tiktok_url && (
                        <a
                          href={v.tiktok_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          TikTok
                        </a>
                      )}
                    </div>
                  </div>
                ))}

                {/* Load more */}
                {videos.length < videosTotal && (
                  <div className="text-center pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMoreVideos}
                      disabled={videosLoading}
                    >
                      {videosLoading ? "読み込み中..." : "もっと見る"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">市場分析</h1>
      <p className="mt-1 text-muted-foreground">
        TikTok Shopのトレンド商品・インフルエンサーを分析。商品をクリックで関連動画を確認。
      </p>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="mt-6"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="products">商品ランキング</TabsTrigger>
            <TabsTrigger value="creators">インフルエンサー</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            {/* Search (products only) */}
            {tab === "products" && (
              <form onSubmit={handleSearch} className="flex items-center gap-1">
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="商品を検索..."
                  className="h-9 w-40"
                />
                <Button type="submit" variant="outline" size="sm" className="h-9">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            )}

            {/* Sort (products only) */}
            {tab === "products" && (
              <select
                value={productSort}
                onChange={(e) => setProductSort(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="day7_units_sold" className="bg-card">
                  7日間販売数順
                </option>
                <option value="day7_gmv" className="bg-card">
                  7日間売上順
                </option>
                <option value="total_units_sold" className="bg-card">
                  総販売数順
                </option>
                <option value="total_gmv" className="bg-card">
                  総売上順
                </option>
                <option value="commission_rate" className="bg-card">
                  手数料率順
                </option>
                <option value="creator_count" className="bg-card">
                  CR数順
                </option>
              </select>
            )}

            {/* Region selector */}
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value} className="bg-card">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <TabsContent value="products" className="mt-6">
          {renderProducts()}
        </TabsContent>
        <TabsContent value="creators" className="mt-6">
          {renderCreators()}
        </TabsContent>
      </Tabs>

      {/* Product Detail Modal */}
      {renderProductDetail()}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border/30 p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
