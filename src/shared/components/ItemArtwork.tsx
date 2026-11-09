import { itemDefinitions } from '../../data/items/itemDefinitions'
import type { ItemId } from '../types/game'

export function ItemArtwork({ itemId, size = 'small' }: { itemId: ItemId; size?: 'small' | 'large' }) {
  const item = itemDefinitions[itemId]
  return <img className={`item-artwork item-artwork-${size}`} src={item.image} alt="" aria-hidden="true" />
}

export function ItemStack({ itemId, quantity, className = '' }: {
  itemId: ItemId
  quantity: number
  className?: string
}) {
  const item = itemDefinitions[itemId]
  return (
    <span className={`item-stack ${className}`.trim()}>
      <ItemArtwork itemId={itemId} />
      <span>{item.name} × {quantity}</span>
    </span>
  )
}
