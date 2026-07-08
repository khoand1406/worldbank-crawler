import PageHeader from "@/components/PageHeader";
import DocumentsExplorer from "./DocumentExplorer";




export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        eyebrow="Tra cứu"
        title="Tài liệu đã thu thập"
        description="Danh sách tài liệu World Bank đã đồng bộ vào PostgreSQL — lọc theo quốc gia, vùng, loại tài liệu, ngôn ngữ và khoảng ngày."
      />
      <DocumentsExplorer />
    </div>
  );
}
