import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileCode,
  FileText,
  Filter,
  Layers,
  Scale,
  Search,
  SlidersHorizontal,
  SplitSquareVertical,
} from "lucide-react"
import { knowledgeApi } from "../api"

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
  const [saving, setSaving] = useState(false)

  const loadStrategies = useCallback(async () => {
    try {
      const data = await knowledgeApi.fetchStrategies()
      if (data) {
        if (data.strategy) setStrategy(data.strategy as ChunkStrategy)
        if (data.similarityThreshold) setSimilarityThreshold(data.similarityThreshold)
        if (data.parentChunkSize) setParentChunkSize(data.parentChunkSize)
        if (data.childChunkSize) setChildChunkSize(data.childChunkSize)
        if (data.rerankerModel) setRerankerModel(data.rerankerModel)
        if (data.topK) setTopK(data.topK)
        if (data.topN) setTopN(data.topN)
      }
    } catch {
      // Keep defaults
    }
  }, [])

  useEffect(() => {
    void loadStrategies()
  }, [loadStrategies])

  const handleSave = async () => {
    setSaving(true)
    try {
      await knowledgeApi.saveStrategies({
        strategy,
        parentChunkSize,
        childChunkSize,
        similarityThreshold,
        rerankerModel,
        topK,
        topN,
      })
      notify.success("Đã cập nhật cấu hình Chiến lược Phân mảnh & Reranker!")
    } catch (err) {
      notify.error("Không thể lưu cấu hình chiến lược", err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-foreground" />
            {t("ai.knowledge.strategies.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("ai.knowledge.strategies.description")}
          </p>
        </div>
        <Status variant="success" className="text-[11px]">
          <StatusIndicator />
          <StatusLabel>Đường ống Hai giai đoạn (Two-Stage Active)</StatusLabel>
        </Status>
      </div>

      {/* 4 Strategy Selection Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setStrategy("hierarchical")}
          className={`rounded-xl border p-3.5 text-left transition-all duration-150 min-w-0 ${
            strategy === "hierarchical"
              ? "border-primary bg-muted/30 shadow-2xs"
              : "border-border hover:bg-muted/20"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background">
              <Layers className="h-4 w-4 text-foreground" />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">Khuyên dùng</Badge>
          </div>
          <h4 className="mt-2.5 text-xs font-bold text-foreground truncate">
            Parent-Child (Phân cấp)
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Lưu chunk nhỏ để so khớp vector chính xác, cung cấp văn bản cha cho LLM để bảo toàn ngữ cảnh.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("semantic")}
          className={`rounded-xl border p-3.5 text-left transition-all duration-150 min-w-0 ${
            strategy === "semantic"
              ? "border-primary bg-muted/30 shadow-2xs"
              : "border-border hover:bg-muted/20"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background">
              <Scale className="h-4 w-4 text-foreground" />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">Semantic</Badge>
          </div>
          <h4 className="mt-2.5 text-xs font-bold text-foreground truncate">
            Semantic Chunking
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Tự động chia tách tài liệu khi độ tương đồng cosine giữa các câu liên tiếp giảm sút dưới ngưỡng.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("markdown_ast")}
          className={`rounded-xl border p-3.5 text-left transition-all duration-150 min-w-0 ${
            strategy === "markdown_ast"
              ? "border-primary bg-muted/30 shadow-2xs"
              : "border-border hover:bg-muted/20"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background">
              <FileCode className="h-4 w-4 text-foreground" />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">AST Schema</Badge>
          </div>
          <h4 className="mt-2.5 text-xs font-bold text-foreground truncate">
            Markdown / Document AST
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Bảo toàn nguyên khối các bảng biểu số liệu (Data Tables) và cấu trúc tiêu đề theo mục H1, H2, H3.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setStrategy("recursive")}
          className={`rounded-xl border p-3.5 text-left transition-all duration-150 min-w-0 ${
            strategy === "recursive"
              ? "border-primary bg-muted/30 shadow-2xs"
              : "border-border hover:bg-muted/20"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background">
              <SplitSquareVertical className="h-4 w-4 text-foreground" />
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">Standard</Badge>
          </div>
          <h4 className="mt-2.5 text-xs font-bold text-foreground truncate">
            Recursive Character
          </h4>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            Phân đoạn cố định theo độ dài ký tự và khoảng chồng lấn (character window overlap).
          </p>
        </button>
      </div>

      {/* 1. Strategy Parameters & Visual Live Previewer */}
      <Card className="shadow-xs min-w-0 border-border">
        <CardHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-foreground shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold">
                  Cấu hình Tham số Phân đoạn ({strategy.toUpperCase()})
                </CardTitle>
                <CardDescription className="text-xs">
                  Thiết lập giới hạn độ dài token và kiểm tra cấu trúc phân đoạn trực tiếp
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">
              Active Configuration
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-xs">
          {/* Controls */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {strategy === "hierarchical" && (
              <>
                <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between font-medium">
                    <span>Parent Chunk Size (Tokens ngữ cảnh gốc):</span>
                    <span className="font-mono font-bold text-foreground">{parentChunkSize} tokens</span>
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
                    Khối văn bản lớn chuyển vào prompt của mô hình để đảm bảo câu trả lời có tính bối cảnh đầy đủ.
                  </p>
                </div>

                <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between font-medium">
                    <span>Child Chunk Size (Tokens vector embedding):</span>
                    <span className="font-mono font-bold text-foreground">{childChunkSize} tokens</span>
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
                    Kích thước ngắn tối ưu hóa khả năng so khớp vector trong không gian đa chiều (Cosine Distance).
                  </p>
                </div>
              </>
            )}

            {strategy === "semantic" && (
              <div className="rounded-lg border border-border p-3 space-y-2 bg-card lg:col-span-2">
                <div className="flex items-center justify-between font-medium">
                  <span>Cosine Similarity Threshold:</span>
                  <span className="font-mono font-bold text-foreground">{similarityThreshold}</span>
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
                  Ngưỡng ngắt đoạn tự động: Khi điểm tương đồng giữa hai câu liên tiếp nhỏ hơn ngưỡng này, đoạn mới sẽ được khởi tạo.
                </p>
              </div>
            )}

            {strategy === "markdown_ast" && (
              <div className="rounded-lg border border-border p-3 space-y-1.5 bg-card lg:col-span-2">
                <span className="font-semibold text-foreground">Phân tích Cây Cú pháp Cấu trúc (Document AST):</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Bảo tồn nguyên vẹn cấu trúc tiêu đề mục lục và khối bảng biểu số liệu (Tables), không chia cắt các hàng cột dữ liệu tài chính.
                </p>
              </div>
            )}

            {strategy === "recursive" && (
              <div className="rounded-lg border border-border p-3 space-y-1.5 bg-card lg:col-span-2">
                <span className="font-semibold text-foreground">Phân mảnh Đệ quy (Recursive Character Splitting):</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Phân chia đoạn văn theo chuẩn 512 ký tự với khoảng chồng lấn 64 ký tự để duy trì liên kết ngữ nghĩa câu.
                </p>
              </div>
            )}
          </div>

          {/* Technical Document Chunk Inspector */}
          <div className="rounded-lg border border-border bg-card p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2 text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Kiểm tra Phân đoạn Văn bản (Document Chunk Structure):
              </span>
              <span className="font-mono text-[10.5px] text-muted-foreground">
                Quy_che_Che_do_Dai_ngo_2026.pdf
              </span>
            </div>

            {strategy === "hierarchical" ? (
              <div className="rounded border border-border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] border-b border-border/60 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">KHỐI CHA #12 (Parent Chunk: ~1024 Tokens)</span>
                    <Badge variant="outline" className="text-[9.5px] font-mono">Đưa vào Prompt LLM</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">Mục 4.2: Chế độ Công tác & Phụ cấp Dự án</span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded border border-border bg-background p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-semibold text-muted-foreground">Child #12.1</span>
                      <span className="font-mono text-muted-foreground">198 tok</span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                      "Nhân sự chính thức được hưởng 14 ngày phép năm có lương, tăng thêm 1 ngày sau mỗi 3 năm thâm niên..."
                    </p>
                  </div>

                  <div className="rounded border border-emerald-600/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">Child #12.2 ✓</span>
                      <Status variant="success" className="h-4 px-1.5 text-[9px]">
                        <StatusIndicator />
                        <StatusLabel>Score: 0.91</StatusLabel>
                      </Status>
                    </div>
                    <p className="text-[10.5px] text-foreground font-medium leading-relaxed">
                      "Đối với nhân sự tham gia dự án Onsite tại khách hàng, phụ cấp công tác phí là 350.000 VNĐ/ngày..."
                    </p>
                  </div>

                  <div className="rounded border border-border bg-background p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-semibold text-muted-foreground">Child #12.3</span>
                      <span className="font-mono text-muted-foreground">214 tok</span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                      "Thời hạn phê duyệt nghỉ phép: Trưởng bộ phận duyệt trước ít nhất 48 giờ làm việc qua hệ thống HRM..."
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded border border-border bg-background p-3 space-y-2">
                <div className="flex items-center gap-2 text-[11px]">
                  <Badge variant="outline" className="font-mono text-[10px]">Heading Block</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="font-mono text-[10px]">Table Data Intact</Badge>
                </div>
                <div className="rounded border border-border/80 bg-muted/30 p-2.5 font-mono text-[10.5px] leading-relaxed text-foreground">
                  # 1. QUY CHẾ TIỀN LƯƠNG VÀ ĐÃI NGỘ NĂM 2026<br />
                  | Chức danh | Lương căn bản | Phụ cấp dự án | Chu kỳ duyệt |<br />
                  | Chuyên viên Cao cấp | 35.000.000 VNĐ | 2.500.000 VNĐ | Hàng tháng |<br />
                  | Kỹ sư Trưởng | 55.000.000 VNĐ | 4.000.000 VNĐ | Hàng tháng |
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Cross-Encoder Reranker Pipeline */}
      <Card className="shadow-xs min-w-0 border-border">
        <CardHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-foreground shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold">
                  Đường ống Reranker Hai Giai đoạn (Two-Stage Cross-Encoder Pipeline)
                </CardTitle>
                <CardDescription className="text-xs">
                  Sàng lọc kết quả truy xuất thô bằng mô hình Cross-Encoder để tối ưu độ chính xác và loại bỏ nhiễu
                </CardDescription>
              </div>
            </div>
            <Status variant="success" className="text-[10px]">
              <StatusIndicator />
              <StatusLabel>Độ trung thực: 94.2%</StatusLabel>
            </Status>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-xs">
          {/* Parameter Inputs */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="font-medium text-foreground">Mô hình Reranker Engine</label>
              <Select value={rerankerModel} onValueChange={setRerankerModel}>
                <SelectTrigger className="mt-1.5 h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cohere-rerank-v3.5">
                    Cohere Rerank v3.5 (Cloud Enterprise)
                  </SelectItem>
                  <SelectItem value="bge-reranker-large">
                    BAAI / BGE-Reranker-Large (On-Prem K3s GPU)
                  </SelectItem>
                  <SelectItem value="none">Tắt Reranker (Chỉ dùng Cosine)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-medium text-foreground">Top-K Ứng viên Thô (Stage 1)</label>
              <Input
                type="number"
                className="mt-1.5 h-8 text-xs font-mono"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
              />
              <span className="text-[10px] text-muted-foreground">Ứng viên từ Hybrid Search (BM25 + Vector)</span>
            </div>

            <div>
              <label className="font-medium text-foreground">Top-N Chunks Chọn lọc (Stage 2)</label>
              <Input
                type="number"
                className="mt-1.5 h-8 text-xs font-mono"
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
              />
              <span className="text-[10px] text-muted-foreground">Số đoạn trích chuẩn xác nhất gửi vào LLM</span>
            </div>
          </div>

          {/* Reranker Comparator Table */}
          <div className="rounded-lg border border-border bg-card p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-border pb-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                Đối chiếu Quy trình: Truy xuất Vector Thô vs Qua Cross-Encoder Rescoring
              </span>
              <span className="text-[10.5px] text-muted-foreground font-mono">
                Truy vấn: "Chính sách trợ cấp công tác phí cho nhân sự đi tỉnh"
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Column 1: Stage 1 Raw Vector */}
              <div className="rounded-md border border-border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground text-[11px] flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    Giai đoạn 1: Kết quả Vector Thô (Cosine Distance)
                  </span>
                  <Badge variant="outline" className="text-[9px] font-mono">Chưa qua Rerank</Badge>
                </div>
                <div className="divide-y divide-border/60 text-[11px]">
                  <div className="py-1.5 flex items-center justify-between">
                    <span className="truncate pr-2 text-muted-foreground">1. "...thủ tục đăng ký vé máy bay và xe đưa đón..."</span>
                    <span className="font-mono text-[10px] font-semibold text-foreground shrink-0">0.84</span>
                  </div>
                  <div className="py-1.5 flex items-center justify-between">
                    <span className="truncate pr-2 text-muted-foreground">2. "...mức phụ cấp công tác phí ngoại tỉnh 350.000đ..."</span>
                    <span className="font-mono text-[10px] font-semibold text-foreground shrink-0">0.81</span>
                  </div>
                  <div className="py-1.5 flex items-center justify-between opacity-60">
                    <span className="truncate pr-2 text-muted-foreground">3. "...chính sách thưởng hoàn thành dự án..." (Nhiễu)</span>
                    <span className="font-mono text-[10px] text-destructive shrink-0">0.78</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Stage 2 Reranked */}
              <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Giai đoạn 2: Kết quả Qua Cross-Encoder Rescoring
                  </span>
                  <Badge variant="outline" className="border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 text-[9px] font-mono">
                    Re-Ranked ✓
                  </Badge>
                </div>
                <div className="divide-y divide-border/60 text-[11px]">
                  <div className="py-1.5 flex items-center justify-between font-medium">
                    <span className="truncate pr-2 text-foreground">1. "...mức phụ cấp công tác phí ngoại tỉnh 350.000đ..."</span>
                    <span className="font-mono text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">0.97 (Relevance)</span>
                  </div>
                  <div className="py-1.5 flex items-center justify-between">
                    <span className="truncate pr-2 text-foreground">2. "...hóa đơn khách sạn và ăn uống khi lưu trú..."</span>
                    <span className="font-mono text-[10.5px] font-medium text-foreground shrink-0">0.91 (Relevance)</span>
                  </div>
                  <div className="py-1.5 flex items-center justify-between text-muted-foreground opacity-75">
                    <span className="truncate pr-2">3. "...thủ tục đăng ký vé máy bay và xe đưa đón..."</span>
                    <span className="font-mono text-[10.5px] shrink-0">0.76 (Relevance)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded border border-border bg-background p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                <strong>Kiểm định chất lượng:</strong> Cross-Encoder đọc đồng thời câu hỏi và toàn văn đoạn trích để tính toán độ tương quan thực tế, loại bỏ kết quả sai lệch và đẩy tài liệu chính xác lên vị trí ưu tiên hàng đầu.
              </span>
            </div>

            <div className="flex justify-end pt-3">
              <Button size="sm" className="text-xs" disabled={saving} onClick={handleSave}>
                {saving ? "Đang lưu..." : "Lưu Cấu hình Chiến lược & Reranker"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
