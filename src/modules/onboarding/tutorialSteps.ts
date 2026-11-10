import type { GameSnapshot, SkillId } from '../../shared/types/game'
import { awardExperience } from '../progression/services/progressionService'

export interface TutorialStep {
  id: string
  title: string
  description: string
  destination: string
  actionLabel: string
  experienceReward: number
  experienceSkill?: SkillId
  requiredLevel?: number
}

export const tutorialSteps: readonly TutorialStep[] = [
  {
    id: 'gather-resources',
    title: 'Nhặt vật liệu quanh bãi biển',
    description: 'Thu thập gỗ, đá và lá cọ để dựng chỗ trú đầu tiên.',
    destination: '/gathering',
    actionLabel: 'Đến bản đồ thu thập',
    experienceReward: 15,
    experienceSkill: 'gathering',
  },
  {
    id: 'craft-axe',
    title: 'Chế tạo rìu thô sơ',
    description: 'Dùng gỗ trôi dạt và đá trong hành trang để làm rìu bằng tay.',
    destination: '/crafting',
    actionLabel: 'Mở chế tạo',
    experienceReward: 15,
    experienceSkill: 'processing',
  },
  {
    id: 'build-campfire',
    title: 'Dựng lửa trại',
    description: 'Dùng cành khô và đá để nhóm lửa bên bãi biển.',
    destination: '/building',
    actionLabel: 'Mở xây dựng',
    experienceReward: 15,
    experienceSkill: 'building',
  },
  {
    id: 'build-leaf-shelter',
    title: 'Dựng lều lá',
    description: 'Đan lá cọ và sợi thực vật thành nơi trú tạm qua đêm.',
    destination: '/building',
    actionLabel: 'Mở xây dựng',
    experienceReward: 20,
    experienceSkill: 'building',
  },
  {
    id: 'reach-level-two',
    title: 'Đạt cấp 2 để tiếp tục',
    description: 'Hoàn thành các bước đầu để nhận đủ kinh nghiệm. Khi đạt cấp 2, bạn có thể nghiên cứu công nghệ định cư.',
    destination: '/progression',
    actionLabel: 'Xem tiến trình',
    experienceReward: 0,
    requiredLevel: 2,
  },
  {
    id: 'explore-nearby-island',
    title: 'Khám phá đảo lân cận',
    description: 'Hoàn thành chuyến dò tìm đầu tiên để mở một hòn đảo mới.',
    destination: '/exploration',
    actionLabel: 'Bắt đầu thám hiểm',
    experienceReward: 0,
  },
  {
    id: 'research-basic-tools',
    title: 'Nghiên cứu dụng cụ',
    description: 'Mở khóa những công thức và công trình phục vụ hành trình dài hơn.',
    destination: '/progression',
    actionLabel: 'Mở tiến trình',
    experienceReward: 0,
  },
  {
    id: 'build-workbench',
    title: 'Dựng bàn chế tạo',
    description: 'Xây bàn chế tạo tại đảo nhà để mở rộng khả năng sản xuất.',
    destination: '/building',
    actionLabel: 'Mở xây dựng',
    experienceReward: 0,
  },
  {
    id: 'research-island-settlement',
    title: 'Nghiên cứu định cư trên đảo',
    description: 'Bạn đã đạt cấp 2. Nghiên cứu công nghệ định cư để mở thêm công trình và hướng sinh tồn mới.',
    destination: '/progression',
    actionLabel: 'Mở tiến trình',
    experienceReward: 0,
  },
]

export function getNextTutorialStep(completedStepIds: readonly string[]): TutorialStep | null {
  return tutorialSteps.find((step) => !completedStepIds.includes(step.id)) ?? null
}

export function completeTutorialStepInState(
  state: GameSnapshot,
  stepId: string,
  grantExperience = true,
): GameSnapshot {
  const completed = state.tutorialCompletedStepIds ?? []
  if (getNextTutorialStep(completed)?.id !== stepId) return state

  const step = tutorialSteps.find((entry) => entry.id === stepId)
  if (!step) return state

  return {
    ...state,
    character: grantExperience && step.experienceReward > 0 && step.experienceSkill
      ? awardExperience(state.character, step.experienceSkill, step.experienceReward)
      : state.character,
    tutorialCompletedStepIds: [...completed, stepId],
  }
}

export function inferTutorialProgress(state: GameSnapshot): string[] {
  const researchedTools = (state.character.researchedTechnologyIds ?? []).includes('tech_basic_tools')
  const researchedSettlement = (state.character.researchedTechnologyIds ?? []).includes('tech_island_settlement')
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

  if (hasExplored || researchedSettlement) return tutorialSteps.map((step) => step.id)

  const completed = new Set<string>()
  const hasUntrackedGameplayProgress = state.tutorialCompletedStepIds === undefined
    && (state.character.level > 1 || state.character.experience > 0)
  if (hasAxe || hasCampfire || hasShelter || researchedTools || hasCompletedWorkbench || hasUntrackedGameplayProgress) {
    completed.add('gather-resources')
  }
  if (hasAxe || hasCampfire || hasShelter || researchedTools || hasCompletedWorkbench || hasUntrackedGameplayProgress) {
    completed.add('craft-axe')
  }
  if (hasCampfire || hasShelter) completed.add('build-campfire')
  if (hasShelter) completed.add('build-leaf-shelter')
  if (researchedTools || hasCompletedWorkbench) completed.add('research-basic-tools')
  if (hasCompletedWorkbench) completed.add('build-workbench')
  if (state.character.level >= 2) completed.add('reach-level-two')
  if (researchedSettlement) completed.add('research-island-settlement')

  return tutorialSteps.filter((step) => completed.has(step.id)).map((step) => step.id)
}

export function shouldShowTutorialIntro(state: GameSnapshot, hasExistingSave: boolean): boolean {
  if (state.tutorialIntroCompleted === true) return false
  if (inferTutorialProgress(state).length > 0) return false
  if (state.character.level > 1 || state.character.experience > 0) return false
  if (state.tutorialIntroCompleted === false) return true
  return !hasExistingSave
}
