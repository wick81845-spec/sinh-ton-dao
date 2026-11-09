type ModulePageProps = {
  title: string
  description: string
}

export function ModulePage({ title, description }: ModulePageProps) {
  return (
    <section className="module-placeholder">
      <span className="section-kicker">HẢI GIỚI SINH TỒN · ĐANG PHÁT TRIỂN</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="placeholder-card">
        <span className="placeholder-symbol" aria-hidden="true">✧</span>
        <div>
          <strong>Phần nền tảng đã sẵn sàng</strong>
          <p>Khu vực này sẽ được triển khai theo từng module. Dữ liệu multiplayer hiện chưa được kết nối.</p>
        </div>
      </div>
    </section>
  )
}
