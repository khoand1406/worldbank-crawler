import DocumentsExplorer from "./DocumentExplorer";



export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6">
        <p className="eyebrow mb-1">Tra cứu</p>
        <h1 className="text-xl font-semibold text-ink">Tài liệu đã thu thập</h1>
        <p className="mt-1 text-sm text-ink-soft/60">
          Danh sách tài liệu World Bank đã đồng bộ vào PostgreSQL — lọc theo quốc
          gia, vùng, loại tài liệu, ngôn ngữ và khoảng ngày.
        </p>
      </header>
      <DocumentsExplorer />
    </div>
  );
}
