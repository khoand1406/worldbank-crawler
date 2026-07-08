import PageHeader from "@/components/PageHeader";
import SyncJobsExplorer from "./SyncJobsExplorer";


export default function SyncJobsPage() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        eyebrow="Vận hành"
        title="Lượt đồng bộ"
        description="Tạo và theo dõi các lượt thu thập dữ liệu từ World Bank Documents API — tối đa 10.000 bản ghi mỗi lượt."
      />
      <SyncJobsExplorer />
    </div>
  );
}
