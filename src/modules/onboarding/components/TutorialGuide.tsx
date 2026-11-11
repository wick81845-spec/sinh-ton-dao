import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../../app/providers/useGame'
import { gameEventBus } from '../../../services/events/gameEvents'
import { isFishingActivityId } from '../../gathering/data/fishingConfig'
import { getNextTutorialStep, inferTutorialProgress, tutorialSteps } from '../tutorialSteps'
import { experienceRewardMultiplier } from '../../progression/services/progressionService'

const noCompletedSteps: string[] = []

export function TutorialGuide() {
  const { gameState, completeTutorialStep, beginTutorial } = useGame()
  const [isOpen, setIsOpen] = useState(false)
  const savedStepIds = gameState?.tutorialCompletedStepIds ?? noCompletedSteps
  const completedStepIds = tutorialSteps
    .filter((step) => savedStepIds.includes(step.id))
    .map((step) => step.id)
  const currentStep = getNextTutorialStep(completedStepIds)
  const previousStepIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (previousStepIdRef.current && currentStep?.id !== previousStepIdRef.current) {
      setIsOpen(false)
    }
    previousStepIdRef.current = currentStep?.id ?? null
  }, [currentStep?.id])

  useEffect(() => {
    if (!gameState?.tutorialIntroCompleted) return
    inferTutorialProgress(gameState)
      .filter((stepId) => !savedStepIds.includes(stepId))
      .forEach((stepId) => completeTutorialStep(stepId, false))
  }, [completeTutorialStep, gameState, savedStepIds])

  useEffect(() => {
    if (!currentStep) return

    const completeIfCurrent = (stepId: string) => {
      if (currentStep.id === stepId) completeTutorialStep(stepId)
    }

    const subscriptions = [
      gameEventBus.on('gathering:completed', ({ activityId }) => {
        if (!isFishingActivityId(activityId)) completeIfCurrent('gather-resources')
      }),
      gameEventBus.on('technology:researched', ({ technologyId }) => {
        if (technologyId === 'tech_basic_tools') completeIfCurrent('research-basic-tools')
        if (technologyId === 'tech_island_settlement') completeIfCurrent('research-island-settlement')
      }),
      gameEventBus.on('building:completed', ({ buildingId }) => {
        const definitionId = gameState?.buildings.find((building) => building.id === buildingId)?.definitionId
        if (definitionId === 'building_campfire') completeIfCurrent('build-campfire')
        if (definitionId === 'building_shelter') completeIfCurrent('build-leaf-shelter')
        if (definitionId === 'building_workbench') completeIfCurrent('build-workbench')
      }),
      gameEventBus.on('crafting:completed', ({ recipeId }) => {
        if (recipeId === 'recipe_wooden_axe') completeIfCurrent('craft-axe')
      }),
      gameEventBus.on('exploration:completed', ({ taskId }) => {
        if (taskId === 'survey-nearby-island') completeIfCurrent('explore-nearby-island')
      }),
    ]

    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }, [completeTutorialStep, currentStep, gameState?.buildings])

  if (!gameState || gameState.character.status !== 'alive') return null

  if (!gameState.tutorialIntroCompleted) {
    return (
      <div className="tutorial-intro-backdrop">
        <section
          className="tutorial-intro-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-intro-title"
          aria-describedby="tutorial-intro-story"
        >
          <div className="tutorial-intro-scene" role="img" aria-label="Hòn đảo nhiệt đới sau một vụ rơi máy bay">
            <span className="tutorial-intro-plane" aria-hidden="true">✈</span>
            <span className="tutorial-intro-scene-label">SAU CƠN BÃO</span>
            <span className="tutorial-intro-scene-title">Bờ biển xa lạ</span>
          </div>
          <div className="tutorial-intro-copy">
            <span className="section-kicker">HẢI GIỚI SINH TỒN · MỞ ĐẦU</span>
            <h1 id="tutorial-intro-title">Tỉnh dậy sau vụ rơi máy bay</h1>
            <p id="tutorial-intro-story">
              Cơn bão quật máy bay xuống biển. Bạn trôi dạt vào một hòn đảo hoang,
              may mắn còn giữ được túi hành trang với 3 quả dại, 3 phần nước suối
              cùng vài vật liệu nhặt được từ xác máy bay.
            </p>
            <p className="tutorial-intro-mission">
              Hãy kiểm tra bãi biển, chế tạo công cụ và dựng nơi trú trước khi trời tối.
            </p>
            <div className="tutorial-intro-supplies" aria-label="Vật phẩm khởi đầu">
              <span>3 quả dại</span>
              <span>3 nước suối</span>
              <span>Gỗ · đá · lá cọ</span>
            </div>
            <button className="tutorial-intro-start" type="button" onClick={beginTutorial}>
              Bắt đầu sinh tồn <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (!currentStep) return null

  return (
    <aside className="tutorial-guide" aria-label="Nhiệm vụ tân thủ">
      {isOpen ? (
        <section className="tutorial-guide-card">
          <header className="tutorial-guide-header">
            <div>
              <span className="section-kicker">NHIỆM VỤ TÂN THỦ</span>
              <strong>Bước {completedStepIds.length + 1} / {tutorialSteps.length}</strong>
            </div>
            <button type="button" aria-label="Đóng nhiệm vụ" onClick={() => setIsOpen(false)}>×</button>
          </header>

          <div className="tutorial-guide-progress" role="progressbar" aria-label="Tiến độ nhiệm vụ tân thủ" aria-valuenow={completedStepIds.length} aria-valuemin={0} aria-valuemax={tutorialSteps.length}>
            <span style={{ width: `${completedStepIds.length / tutorialSteps.length * 100}%` }} />
          </div>
          <span className="tutorial-step-label">MỤC TIÊU TIẾP THEO</span>
          <h2>{currentStep.title}</h2>
          <p>{currentStep.description}</p>
          {currentStep.experienceReward > 0 && (
            <p className="tutorial-step-reward">Thưởng hoàn thành: +{currentStep.experienceReward * experienceRewardMultiplier} XP</p>
          )}
          <Link className="tutorial-guide-action" to={currentStep.destination} onClick={() => setIsOpen(false)}>
            {currentStep.actionLabel}<span aria-hidden="true">↗</span>
          </Link>
        </section>
      ) : (
        <button
          className="tutorial-guide-reopen"
          type="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
        >
          <span aria-hidden="true">✦</span>
          Nhiệm vụ tân thủ
          <small>{completedStepIds.length}/{tutorialSteps.length}</small>
        </button>
      )}
    </aside>
  )
}
