import SyncJobsExplorer from "./SyncJobsExplorer";


export default function SyncJobsPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-6">
        <p className="eyebrow mb-1">Vận hành</p>
        <h1 className="text-xl font-semibold text-ink">Lượt đồng bộ</h1>
        <p className="mt-1 text-sm text-ink-soft/60">
          Tạo và theo dõi các lượt thu thập dữ liệu từ World Bank Documents API
          — tối đa 10.000 bản ghi mỗi lượt.
        </p>
      </header>
      <SyncJobsExplorer />
    </div>
  );
}
