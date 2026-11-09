import type { GameSnapshot } from '../../shared/types/game'

export interface TutorialStep {
  id: string
  title: string
  description: string
  destination: string
  actionLabel: string
}

export const tutorialSteps: readonly TutorialStep[] = [
  {
    id: 'gather-resources',
    title: 'Nhặt vật liệu quanh bãi biển',
    description: 'Thu thập gỗ, đá và lá cọ để dựng chỗ trú đầu tiên.',
    destination: '/gathering',
    actionLabel: 'Đến bản đồ thu thập',
  },
  {
    id: 'craft-axe',
    title: 'Chế tạo rìu thô sơ',
    description: 'Dùng gỗ trôi dạt và đá trong hành trang để làm rìu bằng tay.',
    destination: '/crafting',
    actionLabel: 'Mở chế tạo',
  },
  {
    id: 'build-campfire',
    title: 'Dựng lửa trại',
    description: 'Dùng cành khô và đá để nhóm lửa bên bãi biển.',
    destination: '/building',
    actionLabel: 'Mở xây dựng',
  },
  {
    id: 'build-leaf-shelter',
    title: 'Dựng lều lá',
    description: 'Đan lá cọ và sợi thực vật thành nơi trú tạm qua đêm.',
    destination: '/building',
    actionLabel: 'Mở xây dựng',
  },
  {
    id: 'explore-nearby-island',
    title: 'Khám phá đảo lân cận',
    description: 'Hoàn thành chuyến dò tìm đầu tiên để mở một hòn đảo mới.',
    destination: '/exploration',
    actionLabel: 'Bắt đầu thám hiểm',
  },
  {
    id: 'research-basic-tools',
    title: 'Nghiên cứu dụng cụ',
    description: 'Mở khóa những công thức và công trình phục vụ hành trình dài hơn.',
    destination: '/progression',
    actionLabel: 'Mở tiến trình',
  },
  {
    id: 'build-workbench',
    title: 'Dựng bàn chế tạo',
    description: 'Xây bàn chế tạo tại đảo nhà để mở rộng khả năng sản xuất.',
    destination: '/building',
    actionLabel: 'Mở xây dựng',
  },
]

export function getNextTutorialStep(completedStepIds: readonly string[]): TutorialStep | null {
  return tutorialSteps.find((step) => !completedStepIds.includes(step.id)) ?? null
}

export function inferTutorialProgress(state: GameSnapshot): string[] {
  const researchedTools = (state.character.researchedTechnologyIds ?? []).includes('tech_basic_tools')
  const hasCompletedWorkbench = state.buildings.some((building) => (
    building.definitionId === 'building_workbench' && building.status === 'completed'
  ))
  const hasAxe = [...state.inventory.slots, ...state.storage.slots]
    .some((slot) => slot.itemId === 'item_wooden_axe')
  const hasCampfire = state.buildings.some((building) => (
    building.definitionId === 'building_campfire' && building.status === 'completed'
  ))
  const hasShelter = state.buildings.some((building) => (
    building.definitionId === 'building_shelter' && building.status === 'completed'
  ))
  const hasExplored = state.discoveredIslandIds.includes('island_002')
    || state.explorationLog.some((entry) => entry.taskId === 'survey-nearby-island')

  if (hasExplored) return tutorialSteps.map((step) => step.id)

  const completed = new Set<string>()
  if (hasAxe || hasCampfire || hasShelter || researchedTools || hasCompletedWorkbench || state.character.level > 1) {
    completed.add('gather-resources')
  }
  if (hasAxe || hasCampfire || hasShelter || researchedTools || hasCompletedWorkbench || state.character.level > 1) {
    completed.add('craft-axe')
  }
  if (hasCampfire || hasShelter) completed.add('build-campfire')
  if (hasShelter) completed.add('build-leaf-shelter')
  if (researchedTools || hasCompletedWorkbench) completed.add('research-basic-tools')
  if (hasCompletedWorkbench) completed.add('build-workbench')
  if (hasCompletedWorkbench) completed.add('build-workbench')

  return tutorialSteps.filter((step) => completed.has(step.id)).map((step) => step.id)
}
