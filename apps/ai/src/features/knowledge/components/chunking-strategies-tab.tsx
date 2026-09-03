import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileCode,
  Filter,
  Layers,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  SplitSquareVertical,
  Zap,
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
      {/* Header Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            {t("ai.knowledge.strategies.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("ai.knowledge.strategies.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-[10px] gap-1 font-mono">
            <Zap className="h-3 w-3" /> Two-Stage RAG Active
          </Badge>
        </div>
      </div>

      {/* 4 Strategy Selection Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setStrategy("hierarchical")}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 min-w-0 ${
            strategy === "hierarchical"
              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md shadow-primary/5"
              : "border-border/70 hover:border-border hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-lg border bg-background/80 p-2 shadow-2xs">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary font-medium">Khuyên dùng</Badge>
          </div>
          <h4 className="mt-3 text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
            Parent-Child (Phân cấp)
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Lưu chunk nhỏ để match vector chuẩn xác, trả chunk cha lớn cho LLM không bị đứt đoạn ngữ cảnh.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("semantic")}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 min-w-0 ${
            strategy === "semantic"
              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md shadow-primary/5"
              : "border-border/70 hover:border-border hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-lg border bg-background/80 p-2 shadow-2xs">
              <Sparkles className="h-4 w-4 text-indigo-500" />
            </div>
            <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-600 bg-indigo-500/10">AI-Powered</Badge>
          </div>
          <h4 className="mt-3 text-xs font-bold text-foreground truncate group-hover:text-indigo-600 transition-colors">
            Semantic Chunking
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Tự động chia tách văn bản thông minh khi khoảng cách ngữ nghĩa giữa hai câu liên tiếp sụt giảm.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("markdown_ast")}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 min-w-0 ${
            strategy === "markdown_ast"
              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md shadow-primary/5"
              : "border-border/70 hover:border-border hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-lg border bg-background/80 p-2 shadow-2xs">
              <FileCode className="h-4 w-4 text-cyan-500" />
            </div>
            <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-600 bg-cyan-500/10">AST Parser</Badge>
          </div>
          <h4 className="mt-3 text-xs font-bold text-foreground truncate group-hover:text-cyan-600 transition-colors">
            Markdown / Document AST
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Bảo toàn nguyên khối từng tiêu đề H1, H2, H3 và giữ nguyên bảng biểu dữ liệu, không cắt ngang xương câu.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("recursive")}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 min-w-0 ${
            strategy === "recursive"
              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md shadow-primary/5"
              : "border-border/70 hover:border-border hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="rounded-lg border bg-background/80 p-2 shadow-2xs">
              <SplitSquareVertical className="h-4 w-4 text-amber-500" />
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">Cơ bản</Badge>
          </div>
          <h4 className="mt-3 text-xs font-bold text-foreground truncate group-hover:text-amber-600 transition-colors">
            Recursive Character
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Phương pháp phân đoạn văn bản truyền thống theo độ dài ký tự cố định và khoảng chồng lấn (overlap).
          </p>
        </button>
      </div>

      {/* 1. Strategy Parameters & Visual Live Previewer */}
      <Card className="shadow-xs min-w-0 border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold">
                  Tham số Tinh chỉnh & Trực quan hóa ({strategy.toUpperCase()})
                </CardTitle>
                <CardDescription className="text-xs">
                  Điều chỉnh kích thước phân đoạn và xem trước cách thuật toán bẻ khóa văn bản thực tế
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] bg-muted/40">
              Live Inspector
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 text-xs">
          {/* Controls */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {strategy === "hierarchical" && (
              <>
                <div className="rounded-xl border border-border/60 p-3.5 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between font-medium">
                    <span>Parent Chunk Size (Văn bản ngữ cảnh gốc):</span>
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
                    Khối văn bản lớn cung cấp đầy đủ ngữ cảnh để LLM trả lời chuẩn mực mà không bị đứt đoạn thông tin.
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 p-3.5 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between font-medium">
                    <span>Child Chunk Size (Embedding Vector con):</span>
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
                    Kích thước siêu nhỏ giúp vector tập trung cao độ vào ý tưởng cốt lõi, tăng độ chính xác truy xuất.
                  </p>
                </div>
              </>
            )}

            {strategy === "semantic" && (
              <div className="rounded-xl border border-border/60 p-3.5 bg-muted/20 space-y-2 lg:col-span-2">
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
                  Ngưỡng tương đồng tối thiểu. Khi khoảng cách vector giữa 2 câu liên tiếp vượt quá ngưỡng này, hệ thống tự tách thành chunk mới.
                </p>
              </div>
            )}

            {strategy === "markdown_ast" && (
              <div className="rounded-xl border border-border/60 p-3.5 bg-muted/20 space-y-1.5 lg:col-span-2">
                <span className="font-semibold text-foreground">Phân tích Cây Cú pháp Cấu trúc (Document AST Parser):</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tự động nhận diện cấu trúc tệp Markdown, DOCX hoặc PDF: Phân tách theo Heading (# H1, ## H2, ### H3) và bảo tồn nguyên vẹn khối Data Tables (không bao giờ cắt vụn giữa các dòng bảng).
                </p>
              </div>
            )}

            {strategy === "recursive" && (
              <div className="rounded-xl border border-border/60 p-3.5 bg-muted/20 space-y-1.5 lg:col-span-2">
                <span className="font-semibold text-foreground">Phân mảnh Đệ quy (Recursive Splitting):</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tách theo dấu đoạn văn (\n\n) $\rightarrow$ dấu câu (.) $\rightarrow$ khoảng trắng với kích thước 512 ký tự và chồng lấn 64 ký tự.
                </p>
              </div>
            )}
          </div>

          {/* Interactive Document Chunk Inspector */}
          <div className="rounded-xl border border-border/70 bg-background p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <FileCode className="h-3.5 w-3.5 text-primary" />
                Mô phỏng Phân tách Văn bản Doanh nghiệp (Document Chunk Inspector):
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">Quy_che_Che_do_Dai_ngo_2026.pdf</span>
            </div>

            {strategy === "hierarchical" ? (
              <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-primary/20 pb-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">PARENT BLOCK #12 (~1024 Tokens)</span>
                    <Badge variant="outline" className="text-[9px] border-primary/40 text-primary bg-background">
                      Đưa vào LLM Prompt
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">Section 4.2: Chế độ Nghỉ phép & Phụ cấp Dự án</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  <div className="rounded-lg border border-border/80 bg-card p-3 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-bold text-muted-foreground">CHILD #12.1</span>
                      <span className="text-muted-foreground font-mono">198 tok</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      "Nhân sự chính thức được hưởng 14 ngày phép năm có lương, tăng thêm 1 ngày sau mỗi 3 năm thâm niên..."
                    </p>
                  </div>

                  <div className="rounded-lg border-2 border-emerald-500/60 bg-emerald-500/10 p-3 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-bold text-emerald-600">CHILD #12.2 ✓</span>
                      <Badge className="bg-emerald-600 text-[9px] text-white">MATCH (0.91)</Badge>
                    </div>
                    <p className="text-[11px] text-emerald-950 dark:text-emerald-200 font-medium leading-relaxed">
                      "Đối với nhân sự tham gia dự án Onsite tại khách hàng, phụ cấp công tác phí là 350.000 VNĐ/ngày..."
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/80 bg-card p-3 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-bold text-muted-foreground">CHILD #12.3</span>
                      <span className="text-muted-foreground font-mono">214 tok</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      "Thời hạn phê duyệt nghỉ phép: Trưởng bộ phận duyệt trước ít nhất 48 giờ làm việc qua phần mềm HRM..."
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-primary font-semibold">Chunk 1</span>
                  <span className="text-muted-foreground font-mono">Heading #1: Điều khoản chung</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-indigo-600 font-semibold">Chunk 2</span>
                  <span className="text-muted-foreground font-mono">Bảng lương & phụ cấp [Table Block Intact]</span>
                </div>
                <div className="rounded border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground font-mono">
                  # 1. QUY CHẾ TIỀN LƯƠNG VÀ ĐÃI NGỘ NĂM 2026<br />
                  | Vị trí | Lương cơ bản | Thưởng KPI | Phụ cấp |<br />
                  | Senior Dev | 35.000.000 | 15% | 2.500.000 |<br />
                  | Lead Architect | 55.000.000 | 20% | 4.000.000 |
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Cross-Encoder Reranker Pipeline with Real Visual Simulator */}
      <Card className="shadow-xs min-w-0 border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold">
                  Đường ống Reranker Hai Giai đoạn (Two-Stage Cross-Encoder Pipeline)
                </CardTitle>
                <CardDescription className="text-xs">
                  Lọc sạch 80% kết quả rác từ vector thô bằng mô hình Cross-Encoder để tăng độ chuẩn xác RAG lên đến 94%
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-[10px] gap-1">
              <CheckCircle2 className="h-3 w-3" /> Groundedness: 94.2%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 text-xs">
          {/* Controls */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="font-medium text-foreground">Mô hình Reranker Engine</label>
              <Select value={rerankerModel} onValueChange={setRerankerModel}>
                <SelectTrigger className="mt-1.5 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cohere-rerank-v3.5">
                    Cohere Rerank v3.5 (Cloud Multilingual & Table-aware)
                  </SelectItem>
                  <SelectItem value="bge-reranker-large">
                    BAAI / BGE-Reranker-Large (On-Prem GPU Cluster)
                  </SelectItem>
                  <SelectItem value="none">Tắt Reranker (Chỉ dùng Vector Cosine)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-medium text-foreground">Top-K Truy xuất thô (Stage 1 Candidates)</label>
              <Input
                type="number"
                className="mt-1.5 h-8 text-xs font-mono"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
              />
              <span className="text-[10px] text-muted-foreground">Ứng viên từ Hybrid Search (BM25 + Dense Vector)</span>
            </div>

            <div>
              <label className="font-medium text-foreground">Top-N Reranked (Stage 2 LLM Context)</label>
              <Input
                type="number"
                className="mt-1.5 h-8 text-xs font-mono"
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
              />
              <span className="text-[10px] text-muted-foreground">Số chunks chuẩn xác nhất gửi vào prompt LLM</span>
            </div>
          </div>

          {/* Reranker Comparator Visual Flow */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-primary" />
                So sánh Thực tế: Tìm kiếm Thường vs Qua Cross-Encoder Reranker
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Query: "Chính sách trợ cấp công tác phí cho nhân sự đi tỉnh"
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Column 1: Stage 1 Raw Vector */}
              <div className="rounded-lg border border-border/80 bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    Stage 1: Top Candidates (Hybrid Cosine)
                  </span>
                  <Badge variant="outline" className="text-[9px]">Chưa lọc</Badge>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="rounded border bg-muted/30 p-2 flex items-center justify-between">
                    <span className="truncate pr-2 text-muted-foreground">1. "...thủ tục đăng ký vé máy bay và xe đưa đón..."</span>
                    <span className="font-mono text-[10px] text-amber-600 font-bold shrink-0">0.84</span>
                  </div>
                  <div className="rounded border bg-muted/30 p-2 flex items-center justify-between">
                    <span className="truncate pr-2 text-muted-foreground">2. "...mức phụ cấp công tác phí ngoại tỉnh 350.000đ..."</span>
                    <span className="font-mono text-[10px] text-emerald-600 font-bold shrink-0">0.81</span>
                  </div>
                  <div className="rounded border bg-muted/30 p-2 flex items-center justify-between opacity-60">
                    <span className="truncate pr-2 text-muted-foreground">3. "...chính sách thưởng hoàn thành dự án..." (Nhiễu)</span>
                    <span className="font-mono text-[10px] text-destructive font-bold shrink-0">0.78</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Stage 2 Reranked */}
              <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Stage 2: Cross-Encoder Rescored (Top-N)
                  </span>
                  <Badge className="bg-primary text-[9px]">Re-Ranked ✓</Badge>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="rounded border border-emerald-500/50 bg-emerald-500/10 p-2 flex items-center justify-between shadow-2xs">
                    <span className="truncate pr-2 text-emerald-950 dark:text-emerald-200 font-semibold">1. "...mức phụ cấp công tác phí ngoại tỉnh 350.000đ..."</span>
                    <span className="font-mono text-[10px] text-emerald-600 font-bold shrink-0">0.97 (Relevance)</span>
                  </div>
                  <div className="rounded border border-emerald-500/30 bg-background p-2 flex items-center justify-between">
                    <span className="truncate pr-2 text-foreground">2. "...hóa đơn khách sạn và ăn uống khi lưu trú..."</span>
                    <span className="font-mono text-[10px] text-primary font-bold shrink-0">0.91 (Relevance)</span>
                  </div>
                  <div className="rounded border bg-background p-2 flex items-center justify-between opacity-80">
                    <span className="truncate pr-2 text-muted-foreground">3. "...thủ tục đăng ký vé máy bay và xe đưa đón..."</span>
                    <span className="font-mono text-[10px] text-muted-foreground font-bold shrink-0">0.76 (Relevance)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Hiệu quả xác thực:</strong> Loại bỏ hoàn toàn chunk rác số 3, đảo chunk số 2 lên vị trí số 1 với độ liên quan thực tế 0.97. Mô hình AI nhận được thông tin chuẩn xác tuyệt đối!
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
