import { addItems, degradeItemDurability } from '../../inventory/services/inventoryService'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import type { CombatLogEntry, GameSnapshot, ItemQuantity } from '../../../shared/types/game'
import { combatEncounters, combatRules, type CombatEncounterDefinition } from '../data/combatConfig'
import { getMockPlayer } from '../../social/data/playerDirectory'
import { getSurvivalConditions } from '../../survival/utils/survivalCalculator'
import { awardExperience } from '../../progression/services/progressionService'
import { inflictCombatWound } from '../../survival/services/ailmentService'

export type CombatActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

function getEncounter(encounterId: string): CombatEncounterDefinition | undefined {
  return combatEncounters.find((encounter) => encounter.id === encounterId)
}

function isTraveling(state: GameSnapshot): boolean {
  return state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')
}

export function getCombatAvailability(state: GameSnapshot, encounterId: string): string | null {
  const encounter = getEncounter(encounterId)
  if (!encounter) return 'Trận chiến không tồn tại.'
  if (state.character.status !== 'alive' || state.survival.health <= 0) return 'Bạn cần hồi sinh trước khi chiến đấu.'
  if (state.survival.stamina <= 0) return 'Bạn đã cạn thể lực; hãy nghỉ ngơi trước khi chiến đấu.'
  if (state.activeCombat) return 'Đang có một trận chiến.'
  if (state.character.currentLocationId !== encounter.locationId) return 'Bạn không ở đúng địa điểm của trận chiến.'
  if (state.activeGathering || state.activeExploration || state.craftingQueue.length > 0
    || state.shipConstruction || isTraveling(state)) {
    return 'Hãy kết thúc hoạt động hiện tại trước khi chiến đấu.'
  }
  if (encounter.type === 'raid' && state.character.currentLocationId !== state.character.homeIslandId) {
    return 'Chỉ có thể đột kích mô phỏng tại đảo nhà.'
  }
  let inventory = state.inventory
  for (const reward of encounter.loot) {
    const result = addItems(inventory, reward.itemId, reward.quantity)
    if (!result.ok) return 'Túi đồ không đủ chỗ chứa chiến lợi phẩm.'
    inventory = result.container
  }
  return null
}

export function startCombat(state: GameSnapshot, encounterId: string, now: number): CombatActionResult {
  const issue = getCombatAvailability(state, encounterId)
  if (issue) return { ok: false, message: issue }
  const encounter = getEncounter(encounterId)
  if (!encounter) return { ok: false, message: 'Trận chiến không tồn tại.' }
  if (state.character.status !== 'alive' || state.survival.health <= 0) {
    return { ok: false, message: 'Bạn cần hồi sinh trước khi chiến đấu.' }
  }

  return {
    ok: true,
    state: {
      ...state,
      activeCombat: {
        id: `combat-${now}-${state.combatLog.length + 1}`,
        encounterId,
        opponentHealth: encounter.opponentHealth,
        rounds: 0,
        startedAt: now,
      },
    },
    message: `Đã bắt đầu: ${encounter.name}.`,
  }
}

function finishCombat(
  state: GameSnapshot,
  encounter: CombatEncounterDefinition,
  outcome: CombatLogEntry['outcome'],
  now: number,
  loot: ItemQuantity[],
  droppedItems: ItemQuantity[],
  rounds: number,
  message: string,
  playerDied = false,
): CombatActionResult {
  const active = state.activeCombat
  if (!active) return { ok: false, message: 'Không có trận chiến đang diễn ra.' }
  let inventory = state.inventory
  for (const reward of loot) {
    const result = addItems(inventory, reward.itemId, reward.quantity, now)
    if (!result.ok) return { ok: false, message: 'Không thể nhận chiến lợi phẩm; hãy dọn chỗ trong túi đồ.' }
    inventory = result.container
  }
  const log: CombatLogEntry = {
    id: `${active.id}-${outcome}`,
    encounterId: encounter.id,
    encounterType: encounter.type,
    opponentName: encounter.targetPlayerId
      ? getMockPlayer(encounter.targetPlayerId)?.name ?? encounter.name
      : encounter.name,
    locationId: encounter.locationId,
    outcome,
    rounds,
    occurredAt: now,
    loot: loot.map((entry) => ({ ...entry })),
    droppedItems: droppedItems.map((entry) => ({ ...entry })),
  }
  return {
    ok: true,
    state: {
      ...state,
      inventory: playerDied
        ? { ...inventory, slots: [] }
        : inventory,
      character: playerDied
        ? { ...state.character, status: 'dead' }
        : outcome === 'victory'
          ? awardExperience(state.character, 'combat', 15)
          : state.character,
      survival: playerDied
        ? {
          ...state.survival,
          health: 0,
          conditions: getSurvivalConditions({ ...state.survival, health: 0 }),
        }
        : state.survival,
      activeCombat: null,
      combatLog: [...state.combatLog, log].slice(-100),
    },
    message,
  }
}

export function attackCombat(state: GameSnapshot, now: number): CombatActionResult {
  const active = state.activeCombat
  if (!active) return { ok: false, message: 'Không có trận chiến đang diễn ra.' }
  if (state.character.status !== 'alive' || state.survival.health <= 0) {
    return { ok: false, message: 'Nhân vật không thể tiếp tục chiến đấu.' }
  }
  if (state.survival.stamina <= 0) {
    return { ok: false, message: 'Bạn đã cạn thể lực; hãy rút lui và nghỉ ngơi.' }
  }
  const encounter = getEncounter(active.encounterId)
  if (!encounter) return { ok: false, message: 'Không tìm thấy đối thủ.' }

  const legacyAxe = state.inventory.slots.some((slot) => slot.itemId === 'item_wooden_axe')
  const equippedWeapon = state.equippedWeaponId
    && itemDefinitions[state.equippedWeaponId].equipmentSlot === 'weapon'
    ? state.equippedWeaponId
    : undefined
  const weaponId = equippedWeapon ?? (legacyAxe ? 'item_wooden_axe' : undefined)
  const weapon = weaponId ? itemDefinitions[weaponId] : undefined
  const weaponDurability = weaponId ? state.itemDurability?.[weaponId] ?? weapon?.maxDurability ?? 0 : 0
  const hasUsableWeapon = Boolean(weapon && weaponDurability > 0)
  const attackedState = hasUsableWeapon && weaponId
    ? degradeItemDurability(state, weaponId).state
    : state
  const playerDamage = combatRules.baseDamage + (hasUsableWeapon ? weapon?.weaponDamageBonus ?? 0 : 0)
  const remainingWeaponDurability = weaponId ? attackedState.itemDurability?.[weaponId] : undefined
  const durabilityMessage = hasUsableWeapon && weapon
    ? remainingWeaponDurability === undefined
      ? ` ${weapon.name} đã hỏng.`
      : ` Độ bền ${weapon.name}: ${remainingWeaponDurability}/${weapon.maxDurability}.`
    : ''
  const opponentHealth = Math.max(0, active.opponentHealth - playerDamage)
  const rounds = active.rounds + 1
  if (opponentHealth === 0) {
    return finishCombat(
      { ...attackedState, activeCombat: { ...active, opponentHealth, rounds } },
      encounter,
      'victory',
      now,
      encounter.loot,
      [],
      rounds,
      `Chiến thắng ${encounter.name}! Đã nhận chiến lợi phẩm.`,
    )
  }

  const hitState = encounter.attackDamage > 0 ? inflictCombatWound(attackedState) : attackedState
  const health = Math.max(0, hitState.survival.health - encounter.attackDamage)
  if (health === 0) {
    const droppedItems = [
      ...hitState.inventory.slots.map((slot) => ({ itemId: slot.itemId, quantity: slot.quantity })),
      ...(hitState.equippedWeaponId
        ? [{ itemId: hitState.equippedWeaponId, quantity: 1 }]
        : []),
    ]
    const itemDurability = { ...hitState.itemDurability }
    if (hitState.equippedWeaponId) delete itemDurability[hitState.equippedWeaponId]
    const result = finishCombat(
      {
        ...hitState,
        inventory: { ...hitState.inventory, slots: [] },
        equippedWeaponId: undefined,
        itemDurability,
        survival: { ...hitState.survival, health: 0 },
        activeCombat: { ...active, opponentHealth, rounds },
      },
      encounter,
      'defeat',
      now,
      [],
      droppedItems,
      rounds,
      'Bạn đã gục ngã. Toàn bộ vật phẩm trong túi rơi lại; kho chứa vẫn an toàn.',
      true,
    )
    return result
  }

  return {
    ok: true,
    state: {
      ...hitState,
      survival: { ...hitState.survival, health, conditions: getSurvivalConditions({ ...hitState.survival, health }) },
      activeCombat: { ...active, opponentHealth, rounds },
    },
    message: `Bạn gây ${playerDamage} sát thương; đối thủ còn ${opponentHealth} máu.${durabilityMessage}`,
  }
}

export function retreatCombat(state: GameSnapshot, now: number): CombatActionResult {
  const active = state.activeCombat
  if (!active) return { ok: false, message: 'Không có trận chiến đang diễn ra.' }
  const encounter = getEncounter(active.encounterId)
  if (!encounter) return { ok: false, message: 'Không tìm thấy đối thủ.' }
  return finishCombat(state, encounter, 'retreated', now, [], [], active.rounds, 'Bạn đã rút lui khỏi trận chiến.')
}

export function respawnCharacter(state: GameSnapshot): CombatActionResult {
  if (state.character.status !== 'dead') return { ok: false, message: 'Nhân vật chưa cần hồi sinh.' }
  const survival = {
    ...state.survival,
    health: combatRules.respawnHealth,
    stamina: combatRules.respawnStamina,
  }
  return {
    ok: true,
    state: {
      ...state,
      character: { ...state.character, status: 'alive', currentLocationId: state.character.homeIslandId },
      survival: { ...survival, conditions: getSurvivalConditions(survival) },
      ailments: [],
      activeCombat: null,
      activeGathering: null,
      activeExploration: null,
      shipConstruction: null,
    },
    message: 'Bạn đã hồi sinh tại đảo nhà. Vật phẩm trong kho vẫn nguyên vẹn.',
  }
}

export { combatEncounters }
