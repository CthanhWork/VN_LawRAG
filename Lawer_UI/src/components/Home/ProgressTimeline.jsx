const WEEKLY_PROGRESS = [
  {
    label: 'Tuần 1',
    deadline: '23:55 07-10-2025',
    work: 'Chốt phạm vi; tạo repo/CI cho 3 services; dựng skeleton backend, frontend, data.',
  },
  {
    label: 'Tuần 2',
    deadline: '23:55 12-10-2025',
    work: 'Chuẩn hóa dữ liệu; cấu hình DB + storage; ghép API khung và layout UI.',
  },
  {
    label: 'Tuần 3',
    deadline: '23:55 19-10-2025',
    work: 'Pipeline tiền xử lý + embedding đầu; mock API frontend; auth cơ bản backend.',
  },
  {
    label: 'Tuần 4',
    deadline: '23:55 26-10-2025',
    work: 'Chỉ mục RAG v1; endpoint search/QA; UI tra cứu gọi API thực; logging sơ bộ.',
  },
  {
    label: 'Tuần 5',
    deadline: '23:55 02-11-2025',
    work: 'Đánh giá truy vấn; tinh chỉnh prompt; cache/tối ưu truy xuất; polish UI kết quả.',
  },
  {
    label: 'Tuần 6',
    deadline: '23:55 09-11-2025',
    work: 'Hoàn thiện profile + phân quyền; đồng bộ truy vấn gần đây; giám sát dịch vụ + cảnh báo.',
  },
  {
    label: 'Tuần 7',
    deadline: '23:55 16-11-2025',
    work: 'E2E flow 3 services; sửa lỗi giao tiếp; tối ưu thời gian đáp; hướng dẫn triển khai nội bộ.',
  },
  {
    label: 'Tuần 8',
    deadline: '23:55 23-11-2025',
    work: 'Test tự động (unit/API/UI); harden bảo mật; cải thiện trạng thái tải/lỗi.',
  },
  {
    label: 'Tuần 9',
    deadline: '23:55 23-11-2025',
    work: 'Tối ưu tài nguyên model/DB; backup/restore; refine UI/UX và báo cáo log hiệu năng.',
  },
  {
    label: 'Tuần 10',
    deadline: '23:55 23-11-2025',
    work: 'Tổng hợp kết quả; đóng gói release 3 services; tài liệu bàn giao + slide/demo.',
  },
  {
    label: 'Nộp tiến độ đồ án',
    deadline: '23:55 07-12-2025',
    work: 'Nộp file tiến độ thực hiện đồ án + báo cáo online cuối kỳ.',
  },
];

const ProgressTimeline = () => (
  <div className="progress-card">
    <div className="progress-card__header">
      <div>
        <div className="progress-card__eyebrow">Tiến độ 10 tuần</div>
        <h3 className="progress-card__title">Lịch nộp báo cáo</h3>
      </div>
      <span className="progress-card__badge">2025</span>
    </div>

    <div className="progress-card__list">
      {WEEKLY_PROGRESS.map((item) => (
        <div key={item.label} className="progress-card__item">
          <div className="progress-card__week">{item.label}</div>
          <div className="progress-card__desc">{item.work}</div>
          <div className="progress-card__deadline">
            <span className="progress-card__deadline-label">Hạn:</span>
            <span className="progress-card__deadline-value">{item.deadline}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ProgressTimeline;
