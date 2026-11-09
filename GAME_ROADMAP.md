# Lộ trình Hải Giới Sinh Tồn

## Đích sản phẩm đã chốt

- Game web dùng một địa chỉ chung và một thế giới online duy nhất, tối đa 20 người online đồng thời.
- Mỗi tài khoản giữ nhân vật, túi đồ, save và đảo nhà riêng; không tạo nhóm riêng hoặc mã mời.
- Người chơi có thể cùng gặp nhau trong thế giới; các hoạt động co-op cần được triển khai ở những giai đoạn tiếp theo.
- Nội dung dài hạn gồm đảo và cốt truyện, chế tạo/xây dựng, sinh tồn/sinh thái, tàu/hành trình, tiến trình/boss và sự kiện theo mùa.

## Hiện trạng

Đã có nhiều vòng gameplay chơi đơn chạy trên dịch vụ TypeScript phía trình duyệt: sinh tồn cơ bản, thu thập/câu cá, chế tạo, công trình, khám phá, tàu, thời tiết, sự kiện, nghiên cứu và chiến đấu mô phỏng. Đăng nhập Supabase, save theo tài khoản, hiện diện và chat thế giới đã có nền tảng; các migration tương ứng cần được áp dụng ở Supabase. Người mới bắt đầu sau vụ rơi máy bay với khẩu phần trong túi, rồi thu thập, làm rìu thủ công, dựng lửa trại/lều lá và tiếp tục khám phá. Hầu hết luật gameplay vẫn chạy ở trình duyệt; thăm đảo, giao dịch người chơi và một số sự kiện còn mô phỏng, vì vậy đăng nhập chưa đồng nghĩa với co-op hoặc chống gian lận.

## Các giai đoạn để thành game online

### A. Nền tảng online đáng tin cậy

- Chuyển các thay đổi quan trọng của save sang lệnh server kiểm tra và ghi theo revision.
- Xử lý xung đột nhiều tab/thiết bị, reconnect, lỗi mạng và migration save.
- Có log hành động và kiểm thử quyền sở hữu để không nhận trạng thái tùy ý từ client.

### B. Cộng đồng và hoạt động nhiều người

- Trạng thái hiện diện của thế giới chung, một slot cho mỗi tài khoản, giới hạn 20 người và tự hết hạn khi mất kết nối.
- Hồ sơ người chơi, quyền riêng tư và danh sách bạn bè nếu cần, không biến thành sảnh/nhóm riêng.
- Co-op expedition/chiến đấu với lượt, phần thưởng và rủi ro được quyết định phía server.
- Đảo nhà, kho, công trình, nhân vật và túi đồ vẫn thuộc từng người; trao đổi chỉ qua giao dịch có xác nhận.

### C. Vòng sinh tồn hoàn chỉnh

- Hoàn thiện đói/khát/thể lực/nhiệt độ cùng chấn thương, bệnh, hồi phục, ngủ và trang bị bảo hộ.
- Gắn thời tiết vào đi biển, sức khỏe, tầm nhìn, cây trồng, cá và nguy cơ chuyến đi.
- Mùa, chu kỳ sinh vật, vùng tài nguyên, bảo tồn/khai thác quá mức và phục hồi hệ sinh thái.

### D. Thế giới, nhiệm vụ và nội dung

- Mở thêm quần xã/đảo theo cấp độ và phương tiện; mỗi nơi có tài nguyên, cá, nguy hiểm, chợ và bí mật riêng.
- Nhiệm vụ nhiều bước, NPC, phe phái/danh tiếng, nhật ký truyện và lựa chọn có hệ quả.
- Điểm khám phá, di tích, câu đố, cứu hộ và sự kiện đồng bộ giữa người chơi.

### E. Chế tạo, căn cứ, tàu và kinh tế

- Mở công thức theo nghề, công cụ, thiết bị, thuốc, thực phẩm, vật liệu trung gian và công trình.
- Nâng cấp căn cứ theo chức năng, giới hạn không gian và chi phí; lưu quyền sở hữu rõ ràng.
- Tàu có thủy thủ đoàn co-op, nhiên liệu/tình trạng, định tuyến, tai nạn và nhiệm vụ ngoài khơi.
- Chợ từng đảo, nguồn cung/nhu cầu, giá và giao dịch người chơi có xác nhận, chống nhân đôi vật phẩm.

### F. Tiến trình dài hạn và endgame

- Nhánh kỹ năng/nghề, công nghệ, bộ sưu tập, thành tựu và mở khóa có ý nghĩa.
- Boss và khu vực nguy hiểm yêu cầu phối hợp nhóm; phần thưởng cá nhân/nhóm minh bạch.
- Nội dung cuối game lặp lại có mục tiêu, không buộc người chơi phải đăng nhập liên tục.

### G. Sự kiện vận hành và phát hành

- Nhiệm vụ ngày/tuần, mùa có thời hạn, sự kiện cộng đồng và lịch nội dung.
- Công cụ quản trị/cân bằng, chống spam/gian lận, kiểm soát báo cáo và xử lý người chơi.
- Sao lưu/phục hồi, theo dõi lỗi, hiệu năng, khả năng tiếp cận, bảo mật và kiểm thử tải.
- Chính sách quyền riêng tư, khôi phục tài khoản và điều khoản trước khi mở cho người chơi thật.

## Cách triển khai

Mỗi giai đoạn phải có luồng đầu-cuối chạy được, kiểm tra tự động và không hiển thị tính năng như đã hoàn tất nếu còn mô phỏng. Migration Supabase cần được áp dụng vào project trước khi chức năng online tương ứng dùng được. Mốc hiện tại là hiện diện thế giới chung và giới hạn 20 slot; sau đó chuyển hành động gameplay sang xử lý authoritative trước khi mở rộng hoạt động đồng bộ, chiến đấu và giao dịch.
