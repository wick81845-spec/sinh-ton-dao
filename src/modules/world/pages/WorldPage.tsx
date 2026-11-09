import { Link } from 'react-router-dom'
import { useGame } from '../../../app/providers/useGame'
import { getBiomeResources, biomeDefinitionsById } from '../data/biomeDefinitions'
import { getOceanZoneDefinition } from '../data/oceanZoneDefinitions'
import { speciesDefinitions } from '../../ecology/data/ecologyDefinitions'
import { buildingDefinitions } from '../../building/data/buildingDefinitions'
import { islandDefinitions, worldEventDefinitions, worldLocations, worldRegions } from '../data/worldDefinitions'

const islandTypeNames = {
  personal: 'Đảo cá nhân',
  wild: 'Đảo hoang',
  resource: 'Đảo tài nguyên',
  ruins: 'Đảo di tích',
} as const

const abundanceNames = {
  abundant: 'Rất phổ biến',
  common: 'Phổ biến',
  uncommon: 'Không phổ biến',
  rare: 'Hiếm',
  very_rare: 'Cực hiếm',
} as const

const ecologyRoleIcons = {
  flora: '🌿',
  herbivore: '🐐',
  carnivore: '🐺',
  omnivore: '🐗',
  aquatic: '🐟',
  insect: '🐝',
} as const

function getIslandArtwork(biomeId: string): string {
  if (biomeId === 'ancient_island') return '/assets/world/ancient-island.svg'
  if (biomeId === 'rainforest_island') return '/assets/world/rainforest-island.svg'
  return '/assets/world/tropical-island.svg'
}

export function WorldPage() {
  const { gameState, isLoading, error } = useGame()

  if (isLoading) return <p className="page-state">Đang tải dữ liệu thế giới…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu thế giới.'}</p>

  const currentIsland = islandDefinitions.find((island) => island.id === gameState.character.currentLocationId)
  const currentIslandName = currentIsland?.id === gameState.character.homeIslandId
    ? gameState.character.homeIslandName ?? currentIsland.name
    : currentIsland?.name

  return (
    <div className="world-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">THẾ GIỚI · KHÔNG BẢN ĐỒ</span>
          <h1>Đảo nhà &amp; thế giới</h1>
          <p>Thế giới được mô tả bằng dữ liệu đảo, vùng biển và địa điểm đã phát hiện.</p>
        </div>
        <div className="stamina-chip"><strong>{gameState.discoveredIslandIds.length}</strong> đảo đã biết</div>
      </div>

      <section className="world-current-location">
        <div className="building-emblem" aria-hidden="true">◈</div>
        <div>
          <span className="section-kicker">VỊ TRÍ HIỆN TẠI</span>
          <h2>{currentIslandName ?? gameState.character.currentLocationId}</h2>
          <p>{currentIsland?.description ?? 'Địa điểm chưa có mô tả.'}</p>
        </div>
        <div className="world-quick-links">
          <Link className="small-action" to="/exploration">Thám hiểm</Link>
          <Link className="small-action" to="/voyage">Hàng hải</Link>
        </div>
      </section>

      {worldRegions.map((region) => {
        const islands = islandDefinitions.filter((island) => (
          island.regionId === region.id && gameState.discoveredIslandIds.includes(island.id)
        ))
        if (islands.length === 0) return null
        return (
          <section className="world-region" key={region.id}>
            <div className="section-heading">
              <div>
                <span className="section-kicker">VÙNG BIỂN</span>
                <h2>{region.name}</h2>
              </div>
            </div>
            <div className="world-island-grid">
              {islands.map((island) => {
                const location = worldLocations.find((entry) => entry.islandId === island.id)
                const biome = biomeDefinitionsById[island.biomeId]
                const oceanZone = getOceanZoneDefinition(island.oceanZoneId)
                const resources = getBiomeResources(island.biomeId)
                const wildlife = speciesDefinitions.filter((entry) => entry.habitats.includes(island.biomeId)
                  || entry.habitats.includes(island.oceanZoneId))
                const buildings = gameState.buildings.filter((building) => building.islandId === island.id)
                return (
                  <article className={`world-island-card biome-${island.biomeId}`} key={island.id}>
                    <div className="island-artwork">
                      <img src={getIslandArtwork(island.biomeId)} alt="" aria-hidden="true" />
                      <span className="island-artwork-label">{islandTypeNames[island.type]}</span>
                      <span className={`island-risk island-risk-${island.weatherRisk}`}>
                        Rủi ro {island.weatherRisk === 'low' ? 'thấp' : island.weatherRisk === 'moderate' ? 'vừa' : 'cao'}
                      </span>
                    </div>
                    <span className="section-kicker">{biome.name} · {islandTypeNames[island.type]}</span>
                    <h3>{island.id === gameState.character.homeIslandId
                      ? gameState.character.homeIslandName ?? island.name
                      : island.name}</h3>
                    <p>{island.description}</p>
                    <div className="world-island-meta">
                      <span>{location?.name ?? 'Địa điểm chưa khảo sát'}</span>
                      <span>{oceanZone?.name ?? 'Vùng biển chưa xác định'}</span>
                      <span>Quần xã: {biome.climate.temperature === 'hot' ? 'nóng' : biome.climate.temperature === 'warm' ? 'ấm' : biome.climate.temperature === 'temperate' ? 'ôn hòa' : biome.climate.temperature === 'cold' ? 'lạnh' : 'băng giá'} · Mưa {biome.climate.rainfall === 'heavy' ? 'nhiều' : biome.climate.rainfall === 'frequent' ? 'thường xuyên' : biome.climate.rainfall === 'seasonal' ? 'theo mùa' : 'ít'}</span>
                    </div>
                    <p className="biome-description">{biome.description}</p>
                    <div className="biome-resource-list" aria-label={`Tài nguyên tại quần xã ${biome.name}`}>
                      {resources.slice(0, 6).map((resource) => (
                        <span className="biome-resource-chip" key={resource.id} title={`${resource.name} · ${abundanceNames[resource.abundance]}`}>
                          <img src={resource.image} alt="" aria-hidden="true" />
                          <span>{resource.name}<small>{abundanceNames[resource.abundance]}</small></span>
                        </span>
                      ))}
                      {resources.length > 6 && <span className="biome-resource-more">+{resources.length - 6} tài nguyên</span>}
                    </div>
                    <details className="biome-discovery-details">
                      <summary>Khảo sát quần xã</summary>
                      <div className="biome-detail-group">
                        <strong>Địa hình</strong>
                        <div className="biome-tag-list">{biome.terrain.map((terrain) => <span key={terrain}>{terrain}</span>)}</div>
                      </div>
                      <div className="biome-detail-group">
                        <strong>Điều kiện &amp; nguy cơ</strong>
                        <div className="biome-tag-list">{biome.hazards.map((hazard) => <span key={hazard}>{hazard}</span>)}</div>
                      </div>
                      <div className="biome-detail-group">
                        <strong>Tài nguyên ({resources.length})</strong>
                        <div className="biome-resource-list">
                          {resources.map((resource) => (
                            <span className="biome-resource-chip" key={resource.id} title={abundanceNames[resource.abundance]}>
                              <img src={resource.image} alt="" aria-hidden="true" />
                              <span>{resource.name}<small>{abundanceNames[resource.abundance]}</small></span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="biome-detail-group">
                        <strong>Sinh vật ({wildlife.length})</strong>
                        <div className="biome-tag-list biome-species-list">
                          {wildlife.slice(0, 8).map((species) => (
                            <span key={species.id} title={species.protected ? 'Loài được bảo tồn' : species.danger === 'none' ? 'Không nguy hiểm' : `Nguy cơ: ${species.danger}`}>
                              <i aria-hidden="true">{ecologyRoleIcons[species.role]}</i> {species.name}{species.protected ? ' · Bảo tồn' : ''}
                            </span>
                          ))}
                          {wildlife.length > 8 && <span>+{wildlife.length - 8} loài khác</span>}
                        </div>
                      </div>
                      {biome.specialMechanics.map((mechanic) => <p className="biome-mechanic" key={mechanic}>{mechanic}</p>)}
                    </details>
                    {buildings.length > 0 && (
                      <div className="island-building-list">
                        {buildings.map((building) => {
                          const definition = buildingDefinitions.find((entry) => entry.id === building.definitionId)
                          return <span key={building.id}>{definition?.name ?? 'Công trình'} · cấp {building.level}</span>
                        })}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}

      <section className="world-region">
        <div className="section-heading">
          <div>
            <span className="section-kicker">SỰ KIỆN ĐÃ GHI NHẬN</span>
            <h2>Nhật ký thế giới</h2>
          </div>
        </div>
        {gameState.worldEventLog.length === 0
          ? <p className="empty-world-log">Chưa có sự kiện nào. Các sự kiện sẽ được ghi lại khi bạn khám phá.</p>
          : (
            <div className="world-event-list">
              {gameState.worldEventLog.slice().reverse().map((record) => {
                const event = worldEventDefinitions.find((entry) => entry.id === record.eventId)
                const island = islandDefinitions.find((entry) => entry.id === record.locationId)
                return (
                  <article className="world-event-row" key={record.id}>
                    <span className="queue-index">✦</span>
                    <div>
                      <strong>{event?.title ?? 'Sự kiện thế giới'}</strong>
                      <p>{event?.description ?? 'Một sự kiện đã được ghi nhận.'}</p>
                    </div>
                    <small>{island?.name ?? record.locationId}</small>
                  </article>
                )
              })}
            </div>
          )}
      </section>
    </div>
  )
}
