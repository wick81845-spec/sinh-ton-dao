import type { GameSnapshot } from '../../../shared/types/game'
import type { RecipeDefinition } from '../data/recipes'
import {
  getFishProcessingOptions,
  type FishProcessingItemId,
} from '../services/craftingService'

interface FishProcessingSelectorProps {
  state: GameSnapshot
  recipe: RecipeDefinition
  value?: FishProcessingItemId
  onChange(itemId: FishProcessingItemId | undefined): void
}

export function FishProcessingSelector({
  state,
  recipe,
  value,
  onChange,
}: FishProcessingSelectorProps) {
  const options = getFishProcessingOptions(state, recipe)
  const inputQuantity = recipe.fishProcessing?.inputQuantity ?? 1

  return (
    <label className="fish-processing-select">
      <span>Chọn cá · cần {inputQuantity}</span>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(
          options.find((option) => option.itemId === event.currentTarget.value)?.itemId,
        )}
      >
        <option value="">Chọn loài cá…</option>
        {options.map((option) => (
          <option key={option.itemId} value={option.itemId} disabled={Boolean(option.issue)}>
            {option.name} · có {option.quantity}{option.issue ? ` · ${option.issue}` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
