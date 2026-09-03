import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  FileCode,
  Layers,
  Sparkles,
  SplitSquareVertical,
  Sliders,
  CheckCircle2,
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
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold">
          {t("ai.knowledge.strategies.title")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("ai.knowledge.strategies.description")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setStrategy("hierarchical")}
          className={`rounded-xl border p-4 text-left transition-all ${
            strategy === "hierarchical"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border/70 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <Layers className="h-5 w-5 text-primary" />
            <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
          </div>
          <h4 className="mt-2 text-xs font-semibold">Parent-Child (Phân cấp)</h4>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Lưu chunk nhỏ để match vector chuẩn, trả chunk cha lớn cho LLM đủ ngữ cảnh.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("semantic")}
          className={`rounded-xl border p-4 text-left transition-all ${
            strategy === "semantic"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border/70 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <Sparkles className="h-5 w-5 text-primary" />
            <Badge variant="outline" className="text-[10px]">AI-Powered</Badge>
          </div>
          <h4 className="mt-2 text-xs font-semibold">Semantic Chunking</h4>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tự động chia tách văn bản khi độ tương đồng ngữ nghĩa giữa các câu giảm sút.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("markdown_ast")}
          className={`rounded-xl border p-4 text-left transition-all ${
            strategy === "markdown_ast"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border/70 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <FileCode className="h-5 w-5 text-primary" />
            <Badge variant="outline" className="text-[10px]">AST Parser</Badge>
          </div>
          <h4 className="mt-2 text-xs font-semibold">Markdown / Document AST</h4>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Bảo toàn trọn vẹn từng mục H1, H2, H3 và giữ nguyên khối bảng biểu dữ liệu.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("recursive")}
          className={`rounded-xl border p-4 text-left transition-all ${
            strategy === "recursive"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border/70 hover:bg-muted/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <SplitSquareVertical className="h-5 w-5 text-primary" />
            <Badge variant="outline" className="text-[10px]">Standard</Badge>
          </div>
          <h4 className="mt-2 text-xs font-semibold">Recursive Character</h4>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Phương pháp cơ bản theo độ dài ký tự cố định và khoảng chồng lấn (overlap).
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Tham số chiến lược ({strategy.toUpperCase()})
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Tinh chỉnh cấu hình chunking tối ưu cho loại văn bản của doanh nghiệp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-xs">
            {strategy === "hierarchical" && (
              <>
                <div>
                  <div className="flex justify-between font-medium">
                    <span>Parent Chunk Size (Tokens ngữ cảnh cha):</span>
                    <span className="font-mono text-primary">{parentChunkSize} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max="2048"
                    step="128"
                    className="mt-2 w-full"
                    value={parentChunkSize}
                    onChange={(e) => setParentChunkSize(Number(e.target.value))}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Kích thước văn bản gốc cung cấp cho LLM khi một trong các child chunk được kích hoạt.
                  </p>
                </div>
                <div>
                  <div className="flex justify-between font-medium">
                    <span>Child Chunk Size (Tokens embedding con):</span>
                    <span className="font-mono text-primary">{childChunkSize} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="128"
                    max="512"
                    step="32"
                    className="mt-2 w-full"
                    value={childChunkSize}
                    onChange={(e) => setChildChunkSize(Number(e.target.value))}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Kích thước tối ưu cho embedding vector để so khớp ngữ nghĩa chính xác cao.
                  </p>
                </div>
              </>
            )}

            {strategy === "semantic" && (
              <div>
                <div className="flex justify-between font-medium">
                  <span>Cosine Similarity Threshold:</span>
                  <span className="font-mono text-primary">{similarityThreshold}</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="0.95"
                  step="0.02"
                  className="mt-2 w-full"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Ngưỡng tương đồng tối thiểu. Khi độ tương đồng giữa 2 câu liên tiếp nhỏ hơn ngưỡng này, chunk sẽ ngắt.
                </p>
              </div>
            )}

            <div className="rounded-lg border bg-muted/30 p-3">
              <span className="font-medium text-foreground">Trực quan hóa cấu trúc:</span>
              <div className="mt-2 space-y-2 font-mono text-[11px]">
                <div className="rounded border border-primary/40 bg-primary/5 p-2">
                  <span className="font-semibold text-primary">Parent Block #1 (~1024 tok)</span>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    <div className="rounded border bg-card p-1.5 text-center text-[10px]">
                      Child #1.1 (Vector)
                    </div>
                    <div className="rounded border border-emerald-500/50 bg-emerald-500/10 p-1.5 text-center text-[10px] font-semibold text-emerald-600">
                      Child #1.2 (Matched ✓)
                    </div>
                    <div className="rounded border bg-card p-1.5 text-center text-[10px]">
                      Child #1.3 (Vector)
                    </div>
                    <div className="rounded border bg-card p-1.5 text-center text-[10px]">
                      Child #1.4 (Vector)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Cross-Encoder Reranker Pipeline
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Mô hình chấm lại điểm liên quan sau bước tìm kiếm Hybrid Search ban đầu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-xs">
            <div>
              <label className="font-medium">Mô hình Reranker Engine</label>
              <Select value={rerankerModel} onValueChange={setRerankerModel}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cohere-rerank-v3.5">
                    Cohere Rerank v3.5 (Đa ngôn ngữ & Bảng biểu)
                  </SelectItem>
                  <SelectItem value="bge-reranker-large">
                    BAAI / BGE-Reranker-Large (On-Prem GPU)
                  </SelectItem>
                  <SelectItem value="none">Tắt Reranker (Chỉ dùng Vector Cosine)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium">Top-K Truy xuất thô</label>
                <Input
                  type="number"
                  className="mt-1 h-8 text-xs"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                />
                <span className="text-[10px] text-muted-foreground">BM25 + Vector candidates</span>
              </div>
              <div>
                <label className="font-medium">Top-N Reranked</label>
                <Input
                  type="number"
                  className="mt-1 h-8 text-xs"
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value))}
                />
                <span className="text-[10px] text-muted-foreground">Số chunks gửi vào LLM</span>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Lợi ích hai giai đoạn (Two-stage Retrieval):
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Cosine similarity chỉ so khớp khoảng cách hình học giữa 2 vector độc lập. Cross-Encoder reranker đọc đồng thời cả Câu hỏi + Đoạn văn để tính toán tương quan thực tế, giúp loại bỏ 80% kết quả rác và tăng độ chuẩn xác RAG lên đến 94%.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
