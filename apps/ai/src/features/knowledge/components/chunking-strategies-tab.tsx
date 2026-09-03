import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  FileCode,
  Layers,
  Sliders,
  Sparkles,
  SplitSquareVertical,
} from "lucide-react"

type ChunkStrategy = "hierarchical" | "semantic" | "markdown_ast" | "recursive"

export function ChunkingStrategiesTab() {
  const { t } = useI18n()
  const [strategy, setStrategy] = useState<ChunkStrategy>("hierarchical")
  const [similarityThreshold, setSimilarityThreshold] = useState(0.82)
  const [parentChunkSize, setParentChunkSize] = useState(1024)
  const [childChunkSize, setChildChunkSize] = useState(256)
  const [rerankerModel, setRerankerModel] = useState("cohere-rerank-v3.5")
  const [topK, setTopK] = useState(20)
  const [topN, setTopN] = useState(5)

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h3 className="text-sm font-semibold">
          {t("ai.knowledge.strategies.title")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("ai.knowledge.strategies.description")}
        </p>
      </div>

      {/* 4 Strategy Selection Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setStrategy("hierarchical")}
          className={`rounded-xl border p-3.5 text-left transition-all min-w-0 ${
            strategy === "hierarchical"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border/70 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <Layers className="h-5 w-5 text-primary shrink-0" />
            <Badge variant="secondary" className="text-[10px]">Khuyên dùng</Badge>
          </div>
          <h4 className="mt-2.5 text-xs font-semibold text-foreground truncate">Parent-Child (Phân cấp)</h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Lưu chunk nhỏ để match vector chuẩn, trả chunk cha lớn cho LLM đủ ngữ cảnh.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("semantic")}
          className={`rounded-xl border p-3.5 text-left transition-all min-w-0 ${
            strategy === "semantic"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border/70 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <Badge variant="outline" className="text-[10px]">AI-Powered</Badge>
          </div>
          <h4 className="mt-2.5 text-xs font-semibold text-foreground truncate">Semantic Chunking</h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Tự động chia tách văn bản khi độ tương đồng ngữ nghĩa giữa các câu giảm sút.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("markdown_ast")}
          className={`rounded-xl border p-3.5 text-left transition-all min-w-0 ${
            strategy === "markdown_ast"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border/70 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <FileCode className="h-5 w-5 text-primary shrink-0" />
            <Badge variant="outline" className="text-[10px]">AST Parser</Badge>
          </div>
          <h4 className="mt-2.5 text-xs font-semibold text-foreground truncate">Markdown / Document AST</h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Bảo toàn trọn vẹn từng mục H1, H2, H3 và giữ nguyên khối bảng biểu dữ liệu.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("recursive")}
          className={`rounded-xl border p-3.5 text-left transition-all min-w-0 ${
            strategy === "recursive"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border/70 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <SplitSquareVertical className="h-5 w-5 text-primary shrink-0" />
            <Badge variant="outline" className="text-[10px]">Cơ bản</Badge>
          </div>
          <h4 className="mt-2.5 text-xs font-semibold text-foreground truncate">Recursive Character</h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Phương pháp cơ bản theo độ dài ký tự cố định và khoảng chồng lấn (overlap).
          </p>
        </button>
      </div>

      {/* 1. Strategy Parameters & Visual Simulator - Full Width */}
      <Card className="shadow-xs min-w-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold">
                  Tham số Chiến lược Phân mảnh ({strategy.toUpperCase()})
                </CardTitle>
                <CardDescription className="text-xs">
                  Tinh chỉnh cấu hình chunking tối ưu theo đặc tính tài liệu doanh nghiệp
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="font-mono text-[10px]">Active Strategy</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 text-xs">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {strategy === "hierarchical" && (
              <>
                <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between font-medium">
                    <span>Parent Chunk Size (Văn bản cha):</span>
                    <span className="font-mono font-semibold text-primary">{parentChunkSize} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max="2048"
                    step="128"
                    className="w-full"
                    value={parentChunkSize}
                    onChange={(e) => setParentChunkSize(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Kích thước văn bản gốc cung cấp cho LLM khi một trong các child chunk được kích hoạt.
                  </p>
                </div>

                <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between font-medium">
                    <span>Child Chunk Size (Văn bản con):</span>
                    <span className="font-mono font-semibold text-primary">{childChunkSize} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="128"
                    max="512"
                    step="32"
                    className="w-full"
                    value={childChunkSize}
                    onChange={(e) => setChildChunkSize(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Kích thước tối ưu cho embedding vector để so khớp ngữ nghĩa chính xác cao.
                  </p>
                </div>
              </>
            )}

            {strategy === "semantic" && (
              <div className="rounded-lg border p-3 bg-muted/20 space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between font-medium">
                  <span>Cosine Similarity Threshold:</span>
                  <span className="font-mono font-semibold text-primary">{similarityThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="0.95"
                  step="0.02"
                  className="w-full"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ngưỡng tương đồng tối thiểu. Khi độ tương đồng giữa 2 câu liên tiếp nhỏ hơn ngưỡng này, chunk sẽ tự động ngắt thành đoạn mới.
                </p>
              </div>
            )}

            {strategy === "markdown_ast" && (
              <div className="rounded-lg border p-3 bg-muted/20 space-y-1.5 lg:col-span-2">
                <span className="font-semibold text-foreground">Quy tắc phân tách theo cấu trúc tài liệu:</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tự động nhận diện cây cú pháp AST của file Markdown/Docx: Cắt chunk theo ranh giới Heading (# H1, ## H2, ### H3) và bảo toàn nguyên vẹn cấu trúc bảng biểu dữ liệu (Data Tables), không bao giờ cắt vụn giữa các dòng bảng.
                </p>
              </div>
            )}

            {strategy === "recursive" && (
              <div className="rounded-lg border p-3 bg-muted/20 space-y-1.5 lg:col-span-2">
                <span className="font-semibold text-foreground">Phân mảnh ký tự đệ quy (Recursive Character):</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Phương pháp chia đoạn văn theo kích thước 512 ký tự với khoảng chồng lấn (overlap) 64 ký tự để giữ sự liền mạch ngữ pháp cơ bản.
                </p>
              </div>
            )}
          </div>

          {/* Visual Simulator Box */}
          <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-xs">Mô phỏng Khối Dữ liệu (Structure Visualization):</span>
              <span className="text-[11px] text-muted-foreground">Tự động thích ứng ngữ cảnh</span>
            </div>
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-primary">Parent Block #1 (~1024 tokens ngữ cảnh gốc)</span>
                <Badge variant="outline" className="text-[10px] bg-background">Gửi vào LLM</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1">
                <div className="rounded-md border bg-card p-2 text-center text-[11px] shadow-2xs">
                  <div className="font-mono text-[10px] text-muted-foreground">Child #1.1</div>
                  <div className="text-[10px] text-muted-foreground truncate">Vector Index</div>
                </div>
                <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-2 text-center text-[11px] shadow-2xs">
                  <div className="font-mono text-[10px] font-semibold text-emerald-600">Child #1.2 ✓</div>
                  <div className="text-[10px] font-medium text-emerald-700 truncate">Matched (0.89)</div>
                </div>
                <div className="rounded-md border bg-card p-2 text-center text-[11px] shadow-2xs">
                  <div className="font-mono text-[10px] text-muted-foreground">Child #1.3</div>
                  <div className="text-[10px] text-muted-foreground truncate">Vector Index</div>
                </div>
                <div className="rounded-md border bg-card p-2 text-center text-[11px] shadow-2xs">
                  <div className="font-mono text-[10px] text-muted-foreground">Child #1.4</div>
                  <div className="text-[10px] text-muted-foreground truncate">Vector Index</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Cross-Encoder Reranker Pipeline - Full Width */}
      <Card className="shadow-xs min-w-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold">
                  Đường ống Reranker Hai Giai đoạn (Two-Stage Cross-Encoder Pipeline)
                </CardTitle>
                <CardDescription className="text-xs">
                  Lọc sạch kết quả tìm kiếm thô bằng mô hình Cross-Encoder để đẩy độ chính xác RAG lên đến 94%
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">
              Advanced RAG
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="font-medium text-foreground">Mô hình Reranker Engine</label>
              <Select value={rerankerModel} onValueChange={setRerankerModel}>
                <SelectTrigger className="mt-1.5 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cohere-rerank-v3.5">
                    Cohere Rerank v3.5 (Cloud Multilingual)
                  </SelectItem>
                  <SelectItem value="bge-reranker-large">
                    BAAI / BGE-Reranker-Large (On-Prem GPU)
                  </SelectItem>
                  <SelectItem value="none">Tắt Reranker (Chỉ dùng Vector Cosine)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-medium text-foreground">Top-K Truy xuất thô (Candidates)</label>
              <Input
                type="number"
                className="mt-1.5 h-8 text-xs font-mono"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
              />
              <span className="text-[10px] text-muted-foreground">Ứng viên từ Hybrid Search (BM25 + Vector)</span>
            </div>

            <div>
              <label className="font-medium text-foreground">Top-N Reranked (Gửi vào LLM)</label>
              <Input
                type="number"
                className="mt-1.5 h-8 text-xs font-mono"
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
              />
              <span className="text-[10px] text-muted-foreground">Số chunks chuẩn xác nhất sau khi chấm lại</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
              <div className="font-semibold text-foreground text-xs">Giai đoạn 1: Hybrid Retrieval</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Truy xuất nhanh {topK} chunks ứng viên bằng kết hợp BM25 Keyword Search và HNSW Vector Cosine Distance.
              </p>
            </div>

            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-1">
              <div className="font-semibold text-primary text-xs">Giai đoạn 2: Cross-Encoder Rerank</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Mô hình Reranker đọc đồng thời cả Câu hỏi + Đoạn văn để tính toán điểm tương quan ngữ cảnh thực tế.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-1">
              <div className="font-semibold text-emerald-700 text-xs">Kết quả: Grounded Context</div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Chọn lọc ra {topN} chunks có điểm tin cậy cao nhất gửi vào prompt của LLM, loại bỏ hoàn toàn 80% chunks rác.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
