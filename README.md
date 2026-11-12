# Hải Giới Sinh Tồn

Game sinh tồn đang được phát triển bằng React, TypeScript và Vite. Đăng nhập, hồ sơ và save theo tài khoản được tích hợp Supabase; phần lớn luật gameplay vẫn chạy ở client, chưa phải gameplay authoritative hoặc multiplayer đồng bộ hoàn chỉnh.

## Chạy dự án

```bash
npm install
npm run dev
```

### Backend (Phase 7)

Tạo project Supabase, áp dụng các migration trong `supabase/migrations/`, sao chép `.env.example` thành `.env` rồi điền Project URL gốc (không có `/rest/v1`) và publishable key vào cả cấu hình frontend `VITE_*` lẫn API. Để khởi tạo game save server, điền thêm secret key chỉ vào `SUPABASE_SECRET_KEY` (server-only). Tuyệt đối không đưa key này vào biến `VITE_*`, frontend hoặc chat.
Đặt `WEB_ORIGIN` đúng với địa chỉ trình duyệt đang dùng và `VITE_API_URL` tới API Fastify; hai địa chỉ localhost và 127.0.0.1 là origin khác nhau. Migration `20261109200000_player_game_state_save.sql` bật lưu save server với revision để phát hiện ghi đè từ thiết bị khác. Khi một tài khoản chưa có save trên server, save cục bộ trên thiết bị đăng nhập đầu tiên sẽ được chuyển lên một lần; save server hiện có luôn được ưu tiên.

Migration `20261111120000_global_weather_and_admin_commands.sql` bật cài đặt thời tiết chung và hàng đợi cập nhật sinh tồn theo người chơi. Tài khoản admin có thể chọn thời tiết áp dụng cho mọi save hoặc gửi chỉ số/bệnh/chấn thương để áp dụng khi người chơi kết nối. API xác minh `is_admin` trực tiếp từ hồ sơ Supabase; quyền giao diện phía trình duyệt không được dùng làm ranh giới bảo mật. Cài đặt thời tiết được đồng bộ định kỳ; lệnh người chơi được nhận trong khoảng 15 giây khi đang online hoặc khi đăng nhập lần sau. Hãy áp dụng migration trước khi cập nhật API và frontend production.

Chạy frontend và API trong hai terminal riêng:

```bash
npm run dev
npm run dev:api
```

Trang `/account` là màn hình xác thực riêng, hỗ trợ đăng nhập và đăng ký qua Supabase Auth bằng tên đăng nhập + mật khẩu. Khi Supabase được cấu hình, mọi route game sẽ chuyển người chưa đăng nhập về `/account`, rồi quay lại route ban đầu sau khi đăng nhập; môi trường local chưa cấu hình Supabase vẫn cho chơi local. Email không xuất hiện trong form; Supabase Auth nhận một email định danh nội bộ thuộc miền `.invalid`, không thể nhận thư. Tài khoản cũ vẫn có thể đăng nhập bằng email. Khi đăng ký, người chơi đặt thêm tên nhân vật và tên đảo cá nhân; chạy migration mới trong `supabase/migrations/` để lưu các thông tin này vào hồ sơ. Sau đăng nhập thành công, save được tải/lưu qua API theo tài khoản và vẫn có bản cache cục bộ; nếu thiếu API URL, game tiếp tục dùng local save. Hành động game vẫn do client xử lý, chưa phải server-authoritative nên không phù hợp với tiến trình cạnh tranh.

Migration `20261109183000_global_world_presence.sql` bật hiện diện cho một thế giới online chung. Mọi người dùng cùng URL game; không có nhóm hay mã mời. Mỗi tài khoản chiếm tối đa một slot và thế giới giới hạn 20 người online. Slot được gia hạn bằng heartbeat và tự hết hạn sau 60 giây mất kết nối. Trang Cộng đồng chỉ hiển thị roster và đảo nhà.

Migration `20261109210000_global_world_chat.sql` bật chat thế giới realtime qua nút nổi ở góc màn hình. Người chơi đã đăng nhập có thể đọc và gửi tin nhắn tối đa 300 ký tự; tên gửi lấy từ hồ sơ, quyền gửi được kiểm tra bằng Supabase Auth và có giới hạn tốc độ cơ bản. Khi tài khoản Auth bị xóa, khóa ngoại cascade qua `player_profiles` sẽ tự xóa tin nhắn chat và trạng thái online của tài khoản đó.

Migration `20261111120000_message_bottle_social.sql` bật gửi, đọc và báo cáo chai thông điệp. Áp dụng tiếp `20261112195500_fix_message_bottle_rpc.sql` để sửa thao tác gửi/đọc/báo cáo trên các project đã cài migration trước đó. Danh sách người chơi ở bản đồ Thu thập lấy vị trí đảo từ save mới nhất của những tài khoản đang online; đây là trạng thái cập nhật theo heartbeat, không phải hoạt động giả lập.

Migration `20261110100000_grant_game_admin_role.sql` thêm quyền quản trị game chỉ đọc từ hồ sơ Supabase, mặc định tắt và không thể tự sửa bằng cập nhật hồ sơ người chơi. Migration này cấp quyền cho tài khoản John đã xác nhận; sau khi áp dụng, tài khoản có thể mở khóa và dịch chuyển nhanh đến các đảo để kiểm thử. Quyền này không phải Supabase service-role; các công cụ điều khiển mới dùng quyền server riêng và kiểm tra lại vai trò trước mỗi thao tác.

Người chơi mới mở đầu sau một vụ rơi máy bay, với quả dại, nước suối và vật liệu trong hành trang. Hướng dẫn nhập môn lưu tiến độ cùng save; bảng nhiệm vụ tân thủ chỉ mở khi bấm và tự thu lại sau khi hoàn thành mục tiêu. Các nhiệm vụ đầu đưa người chơi qua thu thập, chế tạo rìu bằng tay, dựng lửa trại/lều lá rồi tiếp tục nghiên cứu và khám phá. Save cũ hoặc nhân vật đã có tiến triển sẽ bỏ qua cảnh mở đầu. Thể lực chỉ hồi khi người chơi chủ động bấm Nghỉ ngơi; hoạt động, chế tạo, xây dựng hoặc di chuyển sẽ ngắt nghỉ. Lửa trại và bếp nấu đều phải được tiếp nhiên liệu; cành cây, gỗ trôi dạt và than củi lần lượt cho 2, 7 và 18 phút cháy. Bếp hết nhiên liệu thì món đang nấu tạm dừng cho đến khi được đốt tiếp.

Migration `20261109173000_coop_party_lobbies.sql` là schema lịch sử từ hướng nhóm cũ; API và giao diện nhóm đã được gỡ. Không sử dụng các bảng nhóm đó trong gameplay mới; migration được giữ lại để không làm đứt lịch sử những project đã áp dụng.

Đây là bản beta để người chơi đăng nhập, giữ save theo tài khoản, xem roster online, chat thế giới realtime, theo dõi các hiệu ứng sinh tồn tích lũy và nhận cập nhật từ admin (sau khi áp dụng các migration liên quan). Phần lớn hành động game vẫn xử lý trên client; thám hiểm, chiến đấu và giao dịch người chơi server-authoritative chưa có.

## Quy trình đưa game lên mạng

Triển khai theo thứ tự dưới đây để frontend, API và Supabase cùng trỏ đúng địa chỉ:

1. **Chuẩn bị tài khoản và mã nguồn.** Cần project Supabase, repository GitHub chứa mã nguồn, tài khoản hosting frontend (Cloudflare Pages hoặc Vercel) và Node.js hosting cho Fastify API (ví dụ Render hoặc Railway). Thêm domain riêng sau cũng được. Workspace hiện tại cần nằm trong Git repository và được đẩy lên GitHub trước khi bật tự động triển khai.
2. **Tạo Supabase production riêng.** Không dùng project local/dev cho người chơi thật. Chạy các file trong `supabase/migrations/` theo thứ tự tên tăng dần trong SQL Editor hoặc Supabase CLI. Xác nhận các bảng `player_profiles`, `player_game_states`, `world_online_players`, `global_world_capacity`, `global_world_chat_messages`, `global_game_settings` và `game_admin_commands` cùng các hàm RPC đã được tạo. Migration `20261109173000_coop_party_lobbies.sql` là schema lịch sử, không được gameplay hiện tại dùng.
3. **Cấu hình Supabase Auth.** Trong Authentication → URL Configuration, đặt Site URL và Redirect URLs theo domain frontend production (và localhost nếu cần cho dev). Lưu ý đăng ký hiện tạo email định danh `.invalid`, không nhận được thư: xác nhận email phải tắt thì đăng ký mới tạo phiên ngay; khôi phục mật khẩu qua email không hoạt động. Chỉ mở beta cho nhóm thử nghiệm cho đến khi có cách khôi phục tài khoản đáng tin cậy.
4. **Deploy API Fastify.** Chọn Blueprint deploy từ file `render.yaml` trong Render để tạo Web Service Node.js; cấu hình khai báo gói Free, health check và địa chỉ bind công khai. Build command: `npm ci && npm run build`; Start command: `npm run start:api`. Khai báo các biến môi trường được đánh dấu `sync: false` trên trang Render, không commit `.env`:
   - `SUPABASE_URL`: URL gốc HTTPS của project.
   - `SUPABASE_ANON_KEY`: publishable/anon key của project.
   - `SUPABASE_SECRET_KEY`: secret/service-role key, chỉ đặt ở backend; quyền này bỏ qua RLS.
   - `API_HOST=0.0.0.0`; API tự nhận biến `PORT` do Render cấp. `API_PORT` chỉ dùng nếu cần ghi đè port.
   - `WEB_ORIGIN`: origin frontend production chính xác, gồm `https://`, không có path hay dấu `/` cuối.
   Sau khi API chạy, kiểm tra `https://<api-domain>/health` trả về `{"status":"ok"}`. Bản triển khai hiện tại dùng URL API công khai ổn định; nếu host ngủ theo gói miễn phí, request đầu có thể chậm.
5. **Deploy frontend.** Import repository vào Vercel; cấu hình tại `vercel.json` đặt framework Vite, build command `npm run build`, output directory `dist` và fallback cho SPA. Đặt biến build-time:
   - `VITE_SUPABASE_URL`: URL gốc của cùng Supabase project.
   - `VITE_SUPABASE_ANON_KEY`: publishable/anon key (được dùng trên trình duyệt, không phải secret).
   - `VITE_API_URL`: origin API production chính xác, không có `/api/v1`.
   Cần cấu hình SPA fallback để các route như `/account` vẫn mở được khi tải lại trang.
6. **Kết nối và kiểm thử trước khi gửi địa chỉ cho người chơi.** Đặt `WEB_ORIGIN` trên API đúng origin frontend cuối cùng; nếu đổi domain, cập nhật CORS và Supabase Redirect URLs rồi redeploy API/frontend tương ứng. Thử đăng ký/đăng nhập hai tài khoản, tải và lưu save, đăng xuất/đăng nhập lại, roster online, heartbeat, chat, tải lại route sâu và xác nhận mỗi tài khoản chỉ đọc được tiến trình của mình. Theo dõi log API và lỗi Auth trước khi mời người chơi.
7. **Phát hành link chính thức.** Khi kiểm thử đạt, chia sẻ URL frontend production cho người chơi qua kênh riêng. Không gửi URL local `localhost`, secret key, `.env` hoặc thông tin đăng nhập. Trang Cộng đồng trong game không còn nút sao chép/chia sẻ link mời.

**Lưu ý trước khi mở rộng beta:** game save được kiểm tra bằng RLS và qua API server, nhưng phần lớn luật gameplay vẫn do client xử lý; đây chưa phải kiến trúc chống gian lận hay multiplayer đồng bộ hoàn chỉnh. Sao lưu database, giới hạn quyền truy cập hosting, bật cảnh báo chi phí và không đưa `SUPABASE_SECRET_KEY` vào biến `VITE_*`.

Vì tài khoản mới dùng email định danh không nhận thư, phải tắt `Confirm email` tại Supabase Authentication → Providers → Email để đăng ký có phiên đăng nhập ngay. Khôi phục tài khoản qua email sẽ chưa khả dụng; cần thiết kế quy trình khôi phục trước khi triển khai cho người dùng thật.

Trang `/settings` cho phép đổi giao diện sáng/tối, chọn khung cảnh và biểu tượng hồ sơ, lưu các mức âm lượng dự kiến, và đăng xuất khi đã đăng nhập. Tùy chọn được lưu trong trình duyệt; thanh âm lượng chỉ lưu cấu hình cho tới khi âm thanh được tích hợp.

Danh mục tài nguyên giai đoạn đầu nằm tại `src/data/resources/` với ID ổn định, nhóm, nguồn, phương thức khai thác, sản lượng, thời gian, tái sinh và mục đích sử dụng. Có 39 biểu tượng tài nguyên PNG được tách từ ảnh do người chơi cung cấp, làm trong suốt nền và nối theo ID vào danh mục, túi đồ, thu thập và các màn hình thế giới; vật phẩm chế biến và công cụ chưa có hình riêng tiếp tục dùng SVG hiện có. 46 loài cá thuộc bốn cấp hiếm cũng có sprite PNG riêng, dùng trong túi đồ, chợ, danh sách cá lẫn màn hình nhận thưởng. Sổ tay câu cá phân loài theo vùng ven bờ/rạn san hô, ngoài khơi và xác tàu; điều kiện quần xã còn chia nhỏ khu vực có thể bắt gặp. Trang Thu thập có minigame câu cá tương tác: giữ rồi nhả để lấy lực ném mồi, giật cần trong cửa sổ khi cá cắn, giữ kéo lúc cá dịu và nhả dây khi cá chạy để tránh đứt dây. Ném mạnh hơn tăng nhẹ cơ hội gặp cá quý. Thành công/thất bại đều có màn hình kết quả riêng; màn câu cá hiển thị lớn với hoạt cảnh, lực ném, tiến độ kéo và sức căng dây.

Thế giới hiện có 12 đảo, mỗi đảo ghép với một quần xã riêng: nhiệt đới, rừng mưa, di tích cổ, núi đá, núi lửa, rừng ngập mặn, đầm lầy, san hô, ôn đới, rừng lá kim, băng giá và khô hạn. Ảnh đảo được hiển thị trên thẻ thế giới và theo vị trí hiện tại ở trang chính; khảo sát mở khóa các đảo theo tuyến khám phá. Mỗi quần xã mô tả địa hình, nguy cơ, sinh vật, vùng nước, nguồn nước/thức ăn và giới hạn tái tạo. Những thay đổi số lượng quần thể, tác động khai thác quá mức và hệ quả sinh thái liên đảo vẫn là phần mô phỏng tiếp theo.

Processing & Production được tích hợp vào hàng đợi chế tạo: bàn chế tạo dùng để xẻ ván, đan dây, làm cần câu, lao và ba lô; lò nung tạo than; lửa trại đang cháy nướng cá. Cần câu hao độ bền khi câu, vũ khí có ô trang bị riêng, và dụng cụ hư có thể sửa tại bàn chế tạo bằng vật liệu.
Trang Chế biến & chế tạo cũng có thư viện 122 hình minh họa theo các bản vẽ người chơi gửi, chia thành vật liệu, công cụ, trang bị, thực phẩm/thuốc, thuyền và công trình. Đây là thư viện ý tưởng trực quan; các mục chưa có công thức không được xem là vật phẩm chế tạo được trong gameplay.

Các quy trình hiện có thêm phơi trái cây thành thực phẩm bảo quản và nung gỗ thành than củi tại lò; ván gỗ được dùng để xây lò. Chợ đảo có mua/bán với giá cố định và số dư xu được lưu cùng hồ sơ. Trang Tiến trình có nghiên cứu công nghệ tiêu hao vật liệu, yêu cầu cấp độ/tiên quyết và mở khóa công thức hoặc đóng bè. Hành động thu thập, sản xuất, xây dựng, khám phá, nghiên cứu và chiến thắng cấp XP. Sinh tồn gây sát thương sau khi đói/khát cạn. Đây vẫn là bản mô phỏng local: multiplayer/PvP chưa authoritative trên server, còn thời tiết động và cân bằng kinh tế nâng cao chưa triển khai.

Trang nhân vật và sinh tồn hiển thị minh họa cơ thể, mức độ và biểu hiện suy ra từ no bụng, nước, thể lực, sinh lực và thời tiết. Chấn thương, chảy máu, bệnh lý, tâm lý, giấc ngủ và thời lượng hiệu ứng chưa có cơ chế dữ liệu nên chưa được giả lập.

Thời tiết hiện có danh mục 40 điều kiện trong sáu nhóm, tự đổi theo chu kỳ 5 phút tại từng đảo và được giới hạn theo quần xã khí hậu. Cấp thời tiết hiển thị trên thanh trạng thái; thời tiết bất lợi làm chuyến đi lâu hơn, còn thời tiết nguy hiểm khóa khởi hành cho tới khi đổi. Nóng, lạnh và mưa tạo biểu hiện trên bảng trạng thái cơ thể. Thiệt hại tàu, say nắng, hạ thân nhiệt, ảnh hưởng tài nguyên và các hệ quả khác chưa được mô phỏng.

Sự kiện ngẫu nhiên được lưu riêng trong tiến trình của từng tài khoản, không phát sinh từ lịch server hay đồng bộ giữa người chơi. Mỗi tài khoản có bộ chọn sự kiện riêng; mỗi sự kiện mới xuất hiện sau 30 phút, chịu điều kiện về tiến trình, thời tiết và phương tiện. Các tình huống có lợi và bất lợi, với hệ quả ẩn cho tới khi người chơi chọn; lựa chọn và kết quả được trình bày trong bảng nổi rồi lưu vào nhật ký. Cứu người lạ có thể tạo một sự kiện tiếp nối sau 30 phút. Save cũ vẫn được chấp nhận và lịch cũ được nâng sang chu kỳ 30 phút.

## Kiểm tra

```bash
npm run build
npm run lint
npm test
```

## Cấu trúc hiện tại

- `src/app/`: định tuyến và layout ứng dụng.
- `src/modules/`: các module game; những module chưa triển khai hiển thị placeholder.
- `src/data/`: dữ liệu game mô phỏng ban đầu.
- `src/services/`: adapter lưu trữ, đồng hồ và event bus dùng chung.
- `src/shared/`: các kiểu dữ liệu dùng chung.
- `src/styles/`: biến thiết kế và stylesheet toàn cục.
- `server/`: API Fastify, cấu hình môi trường và kiểm tra access token Supabase.
- `supabase/migrations/`: schema tài khoản/hồ sơ và quyền truy cập dữ liệu game.

Lưu trữ local chỉ dành cho dữ liệu mô phỏng trên thiết bị. Sảnh nhóm là tính năng online đầu tiên; save và các hành động liên quan quyền sở hữu, giao dịch, chiến đấu vẫn cần được xác thực ở backend trước khi mở các hoạt động co-op.

## Tiến độ

- Phase 1: nền tảng ứng dụng, điều hướng, giao diện sáng/tối và dữ liệu mô phỏng.
- Phase 2: hồ sơ nhân vật, chỉ số sinh tồn theo thời gian thực, lưu dữ liệu có schema version.
- Phase 3: túi đồ/kho chứa, dùng thức ăn, thu thập tài nguyên có thời gian và tái tạo điểm tài nguyên.
- Phase 4: hàng đợi chế tạo, công trình trên đảo nhà, nâng cấp và migration save schema 2 → 3.
- Phase 5: dữ liệu đảo/địa điểm/sự kiện, thám hiểm có thưởng, đóng bè gỗ và chuyến đi giả lập.
- Phase 6: hồ sơ và quyền thăm đảo, kết bạn, giao dịch xác nhận mô phỏng, chiến đấu/đột kích, rơi vật phẩm, hồi sinh và migration save schema 4 → 5. Các tương tác người chơi vẫn là dữ liệu cục bộ giả lập.
- Phase 7 (phần 1–3): nền Fastify, xác minh tài khoản Supabase, migration hồ sơ/trạng thái game có RLS, trang đăng ký/đăng nhập và khởi tạo/đọc tiến trình riêng theo tài khoản qua server. Hành động game authoritative và WebSocket chưa triển khai.
- Phase 8: hiệu ứng cơ thể, thời tiết động và sự kiện thế giới ngẫu nhiên có lựa chọn cùng hệ quả trên save local; chưa phải multiplayer authoritative.
- Phase 9: hiện diện trong một thế giới chung, chat realtime, save theo tài khoản và hướng dẫn nhập môn có tiến độ lưu; co-op gameplay vẫn cần chuyển lệnh quan trọng sang xử lý authoritative phía server.

Xem [GAME_ROADMAP.md](./GAME_ROADMAP.md) để biết đích co-op đã chốt và các giai đoạn nội dung/systems dự kiến.
