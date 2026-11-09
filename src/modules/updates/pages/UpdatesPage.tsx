const currentReleaseChanges = [
  'Bổ sung sổ tay 70 loài cá, chia thành 7 cấp độ hiếm và phân bố theo đảo, quần xã.',
  'Thêm minigame câu cá với cá giật dây, vùng vẫy và nguy cơ đứt dây hoặc thoát câu.',
  'Thêm kết quả câu cá theo tỷ lệ 75% cá, 18% rác biển và 7% vật phẩm đặc biệt.',
  'Dùng hình ảnh riêng cho 8 loại rác biển và 8 vật phẩm trục vớt.',
  'Hiển thị kích thước và cân nặng ngẫu nhiên của cá sau mỗi lần câu thành công.',
  'Thêm đồng hồ thế giới chung: một ngày game kéo dài 60 phút, hiển thị giờ và giai đoạn ngày đêm.',
  'Điều chỉnh tiêu hao nước theo nhiệt độ ngày đêm; chỉ số sinh tồn tạm dừng khi người chơi offline.',
  'Thêm nút chat thế giới nổi với tin nhắn realtime dành cho người chơi đã đăng nhập.',
  'Thêm cảnh mở đầu rơi máy bay; người mới có thức ăn, nước uống và vật liệu trong hành trang.',
  'Mở công thức rìu chế tạo thủ công, lửa trại và lều lá ngay từ những nhiệm vụ đầu tiên.',
  'Lửa trại và lều lá tăng hồi phục khi nghỉ; lưu tiến độ hướng dẫn cùng save và không phát lại cảnh mở đầu cho save cũ.',
  'Cân bằng lại tiêu hao thể lực theo mức lao động: thu thập, câu cá và thám hiểm đều tốn sức hơn.',
  'Đưa nhiệm vụ tân thủ vào bảng góc màn hình; bấm để mở và bảng tự thu lại khi hoàn thành mục tiêu.',
  'Giãn thời gian xuất hiện sự kiện và hiển thị lựa chọn cùng kết quả trong bảng nổi trên bản đồ.',
  'Thể lực không tự hồi khi đứng yên; người chơi chủ động bấm Nghỉ ngơi để hồi phục và có thể dừng bất cứ lúc nào.',
  'Làm mới sự kiện cá nhân theo hướng có rủi ro và hệ quả hai mặt; mỗi sự kiện cách nhau 30 phút và không đồng bộ qua server.',
]

export function UpdatesPage() {
  return (
    <div className="settings-page updates-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">HẢI GIỚI · NHẬT KÝ PHIÊN BẢN</span>
          <h1>Cập nhật</h1>
          <p>Những nội dung đã có trong bản hiện tại.</p>
        </div>
        <span className="game-beta-badge">BETA TEST</span>
      </div>

      <section className="settings-card updates-release-card" aria-labelledby="current-release-title">
        <div className="settings-section-heading">
          <span className="settings-section-icon" aria-hidden="true">↻</span>
          <div>
            <h2 id="current-release-title">Phiên bản hiện tại · Beta test</h2>
            <p>Các nội dung đã được cập nhật trong bản thử nghiệm hiện tại.</p>
          </div>
        </div>
        <ul className="updates-list">
          {currentReleaseChanges.map((change) => <li key={change}>{change}</li>)}
        </ul>
      </section>

      <section className="settings-card updates-coming-soon-card" aria-label="Sắp ra mắt">
        <span className="updates-status-badge">SẮP RA MẮT</span>
      </section>
    </div>
  )
}
