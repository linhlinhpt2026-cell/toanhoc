import { Engine, Instance } from 'cooljs'
import { touchEventHandler, drawYellowString, addFailedCount } from './utils'
import { background } from './background'
import { lineAction, linePainter } from './line'
import { cloudAction, cloudPainter } from './cloud'
import { hookAction, hookPainter } from './hook'
import { tutorialAction, tutorialPainter } from './tutorial'
import * as constant from './constant'
import { startAnimate } from './animateFuncs'

window.TowerGame = (option = {}) => {
  const {
    width,
    height,
    canvasId,
    soundOn,
    // math tower game manages score itself
    successScore = 0,
    perfectScore = 0,
    // assignment mode options
    assignmentMode = false,
    assignmentGrade = null,
    assignmentQuestions = null,
    onGameOver = null
  } = option

  const game = new Engine({
    canvasId,
    highResolution: true,
    width,
    height,
    soundOn
  })

  const gameUserOption = {
    ...option,
    successScore,
    perfectScore
  }

  const pathGenerator = (path) => `./assets/${path}`

  game.addImg('background', pathGenerator('background.png'))
  game.addImg('hook', pathGenerator('hook.png'))
  game.addImg('blockRope', pathGenerator('block-rope.png'))
  game.addImg('block', pathGenerator('block.png'))
  game.addImg('block-perfect', pathGenerator('block-perfect.png'))
  for (let i = 1; i <= 8; i += 1) {
    game.addImg(`c${i}`, pathGenerator(`c${i}.png`))
  }
  game.addLayer(constant.flightLayer)
  for (let i = 1; i <= 7; i += 1) {
    game.addImg(`f${i}`, pathGenerator(`f${i}.png`))
  }
  game.swapLayer(0, 1)
  game.addImg('tutorial', pathGenerator('tutorial.png'))
  game.addImg('tutorial-arrow', pathGenerator('tutorial-arrow.png'))
  game.addImg('heart', pathGenerator('heart.png'))
  game.addImg('score', pathGenerator('score.png'))
  game.addAudio('drop-perfect', pathGenerator('drop-perfect.mp3'))
  game.addAudio('drop', pathGenerator('drop.mp3'))
  game.addAudio('game-over', pathGenerator('game-over.mp3'))
  game.addAudio('rotate', pathGenerator('rotate.mp3'))
  game.addAudio('bgm', pathGenerator('bgm.mp3'))
  game.setVariable(constant.blockWidth, game.width * 0.25)
  game.setVariable(constant.blockHeight, game.getVariable(constant.blockWidth) * 0.71)
  game.setVariable(constant.cloudSize, game.width * 0.3)
  game.setVariable(constant.ropeHeight, game.height * 0.4)
  game.setVariable(constant.blockCount, 0)
  game.setVariable(constant.successCount, 0)
  game.setVariable(constant.failedCount, 0)
  game.setVariable(constant.gameScore, 0)
  game.setVariable(constant.hardMode, false)
  game.setVariable(constant.gameUserOption, gameUserOption)

  // Math tower game state
  let selectedGrade = null
  let currentQuestion = null
  let currentOptions = []
  let correctOptionIndex = -1
  let hasAnsweredCurrentQuestion = false
  let lastQuestionBlockIndex = 0
  let mathScore = 0
  let correctAnswerCount = 0
  // 'idle' | 'selectGrade' | 'waitingBlock' | 'question' | 'waitingNextBlock' | 'wrongFeedback'
  let mathState = 'idle'
  let wrongFeedbackTimeoutId = null
  let assignmentQuestionIndex = 0
  const answerLog = []

  const randomInt = (min, max) => (
    Math.floor(Math.random() * ((max - min) + 1)) + min
  )

  const shuffleArray = (arr) => {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = a[i]
      a[i] = a[j]
      a[j] = temp
    }
    return a
  }

  const gcd = (a, b) => {
    let x = Math.abs(a)
    let y = Math.abs(b)
    while (y !== 0) {
      const t = y
      y = x % y
      x = t
    }
    return x || 1
  }

  const simplifyFraction = (num, den) => {
    const g = gcd(num, den)
    return {
      num: num / g,
      den: den / g
    }
  }

  const formatFraction = (num, den) => {
    const s = simplifyFraction(num, den)
    return `${s.num}/${s.den}`
  }

  const formatDecimal = (value) => {
    const rounded = Number(value.toFixed(2))
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
      return String(Math.round(rounded))
    }
    if (Math.abs((rounded * 10) - Math.round(rounded * 10)) < 1e-9) {
      return rounded.toFixed(1)
    }
    return rounded.toFixed(2)
  }

  const generateIntegerQuestion = (grade) => {
    const max = grade === 1 ? 10 : 100
    const ops = ['+', '-']
    const op = ops[randomInt(0, ops.length - 1)]
    let a = randomInt(0, max)
    let b = randomInt(0, max)
    let text
    let answer
    if (op === '+') {
      if (a + b > max) {
        const sum = randomInt(0, max)
        a = randomInt(0, sum)
        b = sum - a
      }
      answer = a + b
      text = `${a} + ${b}`
    } else {
      if (a < b) {
        const tmp = a
        a = b
        b = tmp
      }
      answer = a - b
      text = `${a} − ${b}`
    }
    const correct = String(answer)
    const options = new Set()
    options.add(correct)
    while (options.size < 4) {
      let delta = randomInt(1, grade === 1 ? 3 : 10)
      if (Math.random() < 0.5) delta *= -1
      let wrong = answer + delta
      if (wrong < 0) wrong = 0
      if (wrong > max) wrong = max
      options.add(String(wrong))
    }
    const optionArr = shuffleArray(Array.from(options))
    return {
      text,
      correct,
      options: optionArr
    }
  }

  const generateGrade3Question = () => {
    const ops = ['×', '÷']
    const op = ops[randomInt(0, ops.length - 1)]
    let a
    let b
    let text
    let answer
    if (op === '×') {
      a = randomInt(1, 10)
      b = randomInt(1, 10)
      answer = a * b
      text = `${a} × ${b}`
    } else {
      answer = randomInt(1, 10)
      b = randomInt(1, 10)
      a = answer * b
      text = `${a} ÷ ${b}`
    }
    const correct = String(answer)
    const options = new Set()
    options.add(correct)
    while (options.size < 4) {
      let delta = randomInt(1, 5)
      if (Math.random() < 0.5) delta *= -1
      let wrong = answer + delta
      if (wrong <= 0 || wrong > 100) {
        wrong = answer - delta
      }
      if (wrong <= 0 || wrong > 100) {
        wrong = randomInt(1, 100)
      }
      options.add(String(wrong))
    }
    const optionArr = shuffleArray(Array.from(options))
    return {
      text,
      correct,
      options: optionArr
    }
  }

  const generateFractionQuestion = () => {
    const ops = ['+', '−', '×', '÷']
    const sym = ops[randomInt(0, ops.length - 1)]
    const aNum = randomInt(1, 9)
    const aDen = randomInt(2, 9)
    const bNum = randomInt(1, 9)
    const bDen = randomInt(2, 9)
    let rNum
    let rDen
    switch (sym) {
      case '+':
        rNum = (aNum * bDen) + (bNum * aDen)
        rDen = aDen * bDen
        break
      case '−': {
        const left = aNum * bDen
        const right = bNum * aDen
        if (left >= right) {
          rNum = left - right
          rDen = aDen * bDen
        } else {
          rNum = right - left
          rDen = aDen * bDen
        }
        break
      }
      case '×':
        rNum = aNum * bNum
        rDen = aDen * bDen
        break
      default:
        rNum = aNum * bDen
        rDen = aDen * bNum
        break
    }
    const correct = formatFraction(rNum, rDen)
    const text = `${aNum}/${aDen} ${sym} ${bNum}/${bDen}`
    const options = new Set()
    options.add(correct)
    while (options.size < 4) {
      let wNum = rNum + randomInt(-3, 3)
      let wDen = rDen + randomInt(-3, 3)
      if (wDen === 0) wDen = 1
      if (wNum <= 0) wNum = Math.abs(wNum) + 1
      options.add(formatFraction(wNum, wDen))
    }
    const optionArr = shuffleArray(Array.from(options))
    return {
      text,
      correct,
      options: optionArr
    }
  }

  const generateDecimalQuestion = () => {
    const ops = ['+', '−', '×', '÷']
    const sym = ops[randomInt(0, ops.length - 1)]
    let a = randomInt(5, 30) / 10
    let b = randomInt(5, 30) / 10
    if (sym === '÷' && b === 0) {
      b = 1
    }
    let raw
    switch (sym) {
      case '+':
        raw = a + b
        break
      case '−':
        if (a < b) {
          const tmp = a
          a = b
          b = tmp
        }
        raw = a - b
        break
      case '×':
        raw = a * b
        break
      default:
        raw = a / b
        break
    }
    const correct = formatDecimal(raw)
    const text = `${formatDecimal(a)} ${sym} ${formatDecimal(b)}`
    const options = new Set()
    options.add(correct)
    while (options.size < 4) {
      let offset = (randomInt(1, 5) / 10)
      if (Math.random() < 0.5) offset *= -1
      const wrongVal = raw + offset
      options.add(formatDecimal(wrongVal))
    }
    const optionArr = shuffleArray(Array.from(options))
    return {
      text,
      correct,
      options: optionArr
    }
  }

  const generateQuestionForGrade = (grade) => {
    if (grade === 1 || grade === 2) {
      return generateIntegerQuestion(grade)
    }
    if (grade === 3) {
      return generateGrade3Question()
    }
    if (grade === 4) {
      return generateFractionQuestion()
    }
    return generateDecimalQuestion()
  }

  const syncMathScoreToEngine = () => {
    game.setVariable(constant.gameScore, mathScore)
    const userOpt = game.getVariable(constant.gameUserOption)
    if (userOpt && typeof userOpt.setGameScore === 'function') {
      userOpt.setGameScore(mathScore)
    }
  }

  const getGradeButtonRects = () => {
    const { width: w, height: h } = game
    const btnWidth = w * 0.26
    const btnHeight = h * 0.08
    const gapX = w * 0.03
    const startX = (w - ((btnWidth * 3) + (gapX * 2))) / 2
    const row1Y = h * 0.4
    const row2Y = row1Y + btnHeight + (h * 0.04)
    return [
      { x: startX, y: row1Y, width: btnWidth, height: btnHeight },
      { x: startX + btnWidth + gapX, y: row1Y, width: btnWidth, height: btnHeight },
      { x: startX + ((btnWidth + gapX) * 2), y: row1Y, width: btnWidth, height: btnHeight },
      { x: startX + ((btnWidth + gapX) * 0.5), y: row2Y, width: btnWidth, height: btnHeight },
      { x: startX + ((btnWidth + gapX) * 1.5), y: row2Y, width: btnWidth, height: btnHeight }
    ]
  }

  const getAnswerOptionRects = () => {
    const { width: w, height: h } = game
    const boxWidth = w * 0.38
    const boxHeight = h * 0.08
    const gapX = w * 0.04
    const gapY = h * 0.03
    const leftX = (w - ((boxWidth * 2) + gapX)) / 2
    const rightX = leftX + boxWidth + gapX
    const topY = h * 0.62
    const bottomY = topY + boxHeight + gapY
    return [
      { x: leftX, y: topY, width: boxWidth, height: boxHeight },
      { x: rightX, y: topY, width: boxWidth, height: boxHeight },
      { x: leftX, y: bottomY, width: boxWidth, height: boxHeight },
      { x: rightX, y: bottomY, width: boxWidth, height: boxHeight }
    ]
  }

  const drawRoundedRect = (ctx, x, y, w, h, r) => {
    const radius = typeof r === 'number' ? r : 10
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  const drawGradeSelection = () => {
    const { ctx, width: w, height: h } = game
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, w, h)
    ctx.restore()

    drawYellowString(game, {
      string: 'Chọn cấp độ toán',
      size: w * 0.06,
      x: w * 0.5,
      y: h * 0.25,
      textAlign: 'center',
      fontName: 'Arial',
      fontWeight: 'bold'
    })

    drawYellowString(game, {
      string: 'Lớp 1 → Lớp 5',
      size: w * 0.04,
      x: w * 0.5,
      y: h * 0.3,
      textAlign: 'center',
      fontName: 'Arial'
    })

    const btns = getGradeButtonRects()
    const labels = ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5']
    btns.forEach((b, index) => {
      const isSelected = selectedGrade === index + 1
      game.ctx.save()
      game.ctx.lineWidth = w * 0.004
      game.ctx.strokeStyle = isSelected ? '#ffdd55' : '#ffffff'
      game.ctx.fillStyle = isSelected ? 'rgba(255, 221, 85, 0.9)' : 'rgba(0, 0, 0, 0.6)'
      drawRoundedRect(game.ctx, b.x, b.y, b.width, b.height, w * 0.015)
      game.ctx.fill()
      game.ctx.stroke()
      game.ctx.restore()

      drawYellowString(game, {
        string: labels[index],
        size: w * 0.04,
        x: b.x + (b.width / 2),
        y: b.y + (b.height * 0.65),
        textAlign: 'center',
        fontName: 'Arial',
        fontWeight: 'bold'
      })
    })

    drawYellowString(game, {
      string: 'Chạm để chọn lớp rồi xây tháp!',
      size: w * 0.035,
      x: w * 0.5,
      y: h * 0.9,
      textAlign: 'center',
      fontName: 'Arial'
    })
  }

  const drawQuestionAndOptions = () => {
    if (!currentQuestion || !currentOptions.length) return
    const { width: w, height: h } = game

    drawYellowString(game, {
      string: `Lớp ${selectedGrade} - Toán`,
      size: w * 0.04,
      x: w * 0.5,
      y: h * 0.1,
      textAlign: 'center',
      fontName: 'Arial',
      fontWeight: 'bold'
    })

    drawYellowString(game, {
      string: `Câu hỏi: ${currentQuestion.text} = ?`,
      size: w * 0.045,
      x: w * 0.5,
      y: h * 0.2,
      textAlign: 'center',
      fontName: 'Arial'
    })

    drawYellowString(game, {
      string: 'Chọn đáp án đúng để thả khối nhà',
      size: w * 0.035,
      x: w * 0.5,
      y: h * 0.26,
      textAlign: 'center',
      fontName: 'Arial'
    })

    const rects = getAnswerOptionRects()
    const labels = ['A', 'B', 'C', 'D']
    rects.forEach((r, index) => {
      game.ctx.save()
      game.ctx.lineWidth = w * 0.004
      game.ctx.strokeStyle = '#ffffff'
      game.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      drawRoundedRect(game.ctx, r.x, r.y, r.width, r.height, w * 0.015)
      game.ctx.fill()
      game.ctx.stroke()
      game.ctx.restore()

      drawYellowString(game, {
        string: `${labels[index]}: ${currentOptions[index]}`,
        size: w * 0.04,
        x: r.x + (r.width / 2),
        y: r.y + (r.height * 0.65),
        textAlign: 'center',
        fontName: 'Arial'
      })
    })
  }

  const drawMathHud = () => {
    const gameStartNow = game.getVariable(constant.gameStartNow)
    const { width: w, height: h, ctx } = game

    drawYellowString(game, {
      string: 'Số câu đúng',
      size: w * 0.045,
      x: w * 0.24,
      y: w * 0.12,
      textAlign: 'left',
      fontName: 'Arial',
      fontWeight: 'bold'
    })

    drawYellowString(game, {
      string: correctAnswerCount,
      size: w * 0.11,
      x: w * 0.22,
      y: w * 0.2,
      textAlign: 'right',
      fontName: 'Arial'
    })

    const scoreImg = game.getImg('score')
    if (scoreImg) {
      const scoreWidth = scoreImg.width
      const scoreHeight = scoreImg.height
      const zoomedWidth = w * 0.35
      const zoomedHeight = (scoreHeight * zoomedWidth) / scoreWidth
      ctx.drawImage(
        scoreImg,
        w * 0.61,
        w * 0.038,
        zoomedWidth,
        zoomedHeight
      )
    }

    drawYellowString(game, {
      string: mathScore,
      size: w * 0.06,
      x: w * 0.9,
      y: w * 0.11,
      textAlign: 'right',
      fontName: 'Arial'
    })

    const heart = game.getImg('heart')
    const failedCount = game.getVariable(constant.failedCount, 0)
    if (heart) {
      const heartWidth = heart.width
      const heartHeight = heart.height
      const zoomedHeartWidth = w * 0.08
      const zoomedHeartHeight = (heartHeight * zoomedHeartWidth) / heartWidth
      for (let i = 1; i <= 3; i += 1) {
        ctx.save()
        if (i <= failedCount) {
          ctx.globalAlpha = 0.2
        }
        ctx.drawImage(
          heart,
          (w * 0.66) + ((i - 1) * zoomedHeartWidth),
          w * 0.16,
          zoomedHeartWidth,
          zoomedHeartHeight
        )
        ctx.restore()
      }
    }

    // Khi game chưa bắt đầu, chỉ vẽ màn chọn cấp độ
    if (!gameStartNow && mathState !== 'selectGrade') {
      return
    }

    if (mathState === 'selectGrade') {
      drawGradeSelection()
    } else if (mathState === 'question') {
      drawQuestionAndOptions()
    } else if (mathState === 'waitingBlock' || mathState === 'waitingNextBlock') {
      drawYellowString(game, {
        string: 'Đang chuẩn bị khối nhà...',
        size: w * 0.035,
        x: w * 0.5,
        y: h * 0.3,
        textAlign: 'center',
        fontName: 'Arial'
      })
    } else if (mathState === 'wrongFeedback') {
      drawYellowString(game, {
        string: 'Bạn đã trả lời sai!',
        size: w * 0.05,
        x: w * 0.5,
        y: h * 0.3,
        textAlign: 'center',
        fontName: 'Arial',
        fontWeight: 'bold'
      })
    } else if (mathState === 'complete') {
      drawYellowString(game, {
        string: 'Hoàn thành!',
        size: w * 0.06,
        x: w * 0.5,
        y: h * 0.25,
        textAlign: 'center',
        fontName: 'Arial',
        fontWeight: 'bold'
      })
      drawYellowString(game, {
        string: `Đúng: ${correctAnswerCount} / ${answerLog.length}`,
        size: w * 0.04,
        x: w * 0.5,
        y: h * 0.33,
        textAlign: 'center',
        fontName: 'Arial'
      })
    }
  }

  for (let i = 1; i <= 4; i += 1) {
    const cloud = new Instance({
      name: `cloud_${i}`,
      action: cloudAction,
      painter: cloudPainter
    })
    cloud.index = i
    cloud.count = 5 - i
    game.addInstance(cloud)
  }
  const line = new Instance({
    name: 'line',
    action: lineAction,
    painter: linePainter
  })
  game.addInstance(line)
  const hook = new Instance({
    name: 'hook',
    action: hookAction,
    painter: hookPainter
  })
  game.addInstance(hook)

  const loadNextQuestion = () => {
    if (assignmentMode && assignmentQuestions && assignmentQuestions.length > 0) {
      if (assignmentQuestionIndex >= assignmentQuestions.length) {
        mathState = 'complete'
        triggerGameOver(true)
        return
      }
      const q = assignmentQuestions[assignmentQuestionIndex]
      currentQuestion = q
      currentOptions = q.options
      correctOptionIndex = currentOptions.indexOf(q.correct)
    } else {
      currentQuestion = generateQuestionForGrade(selectedGrade)
      currentOptions = currentQuestion.options
      correctOptionIndex = currentOptions.indexOf(currentQuestion.correct)
    }
    hasAnsweredCurrentQuestion = false
    mathState = 'question'
  }

  const triggerGameOver = (completed) => {
    if (onGameOver) {
      setTimeout(() => {
        onGameOver({
          score: mathScore,
          correctCount: correctAnswerCount,
          totalAnswered: answerLog.length,
          answers: answerLog,
          completed: !!completed
        })
      }, 800)
    }
  }

  const originalStartAnimate = startAnimate
  game.startAnimate = (engine, time) => {
    originalStartAnimate(engine, time)
    if (!selectedGrade) return
    const blockIndex = engine.getVariable(constant.blockCount, 0)
    if (blockIndex > lastQuestionBlockIndex) {
      lastQuestionBlockIndex = blockIndex
      loadNextQuestion()
    }
  }

  game.endAnimate = () => {
    drawMathHud()
  }

  game.paintUnderInstance = background

  game.addKeyDownListener('enter', () => {
    if (game.debug) game.togglePaused()
  })

  const getCanvasCoords = (e) => {
    if (!e) return null
    const rect = game.canvas.getBoundingClientRect()
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || null
    const clientX = (touch && touch.clientX) || e.clientX
    const clientY = (touch && touch.clientY) || e.clientY
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return null
    let x = clientX - rect.left
    let y = clientY - rect.top
    if (game.highResolution) {
      x *= 2
      y *= 2
    }
    return { x, y }
  }

  const handleGradeClick = (x, y) => {
    const rects = getGradeButtonRects()
    for (let i = 0; i < rects.length; i += 1) {
      const r = rects[i]
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        selectedGrade = i + 1
        mathState = 'waitingBlock'
        return true
      }
    }
    return false
  }

  const handleAnswerClick = (x, y) => {
    if (!currentOptions.length || hasAnsweredCurrentQuestion) return
    const rects = getAnswerOptionRects()
    let clickedIndex = -1
    for (let i = 0; i < rects.length; i += 1) {
      const r = rects[i]
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        clickedIndex = i
        break
      }
    }
    if (clickedIndex === -1) return
    const isCorrect = clickedIndex === correctOptionIndex
    answerLog.push({
      question: currentQuestion.text,
      selected: currentOptions[clickedIndex],
      correct: currentQuestion.correct,
      isCorrect
    })
    if (isCorrect) {
      hasAnsweredCurrentQuestion = true
      correctAnswerCount += 1
      mathScore += 25
      if (assignmentMode) assignmentQuestionIndex += 1
      syncMathScoreToEngine()
      touchEventHandler(game)

      // Check if assignment complete
      if (assignmentMode && assignmentQuestions && assignmentQuestionIndex >= assignmentQuestions.length) {
        mathState = 'complete'
        triggerGameOver(true)
        return
      }
      mathState = 'waitingNextBlock'
    } else {
      addFailedCount(game)
      syncMathScoreToEngine()
      hasAnsweredCurrentQuestion = true
      if (assignmentMode) assignmentQuestionIndex += 1

      // Check if game over (3 HP lost)
      const newFailedCount = game.getVariable(constant.failedCount, 0)
      if (newFailedCount >= 3) {
        triggerGameOver(false)
        return
      }

      // Check if assignment complete even on wrong answer
      if (assignmentMode && assignmentQuestions && assignmentQuestionIndex >= assignmentQuestions.length) {
        mathState = 'complete'
        triggerGameOver(false)
        return
      }

      mathState = 'wrongFeedback'
      if (wrongFeedbackTimeoutId) {
        window.clearTimeout(wrongFeedbackTimeoutId)
      }
      wrongFeedbackTimeoutId = window.setTimeout(() => {
        if (!selectedGrade) return
        loadNextQuestion()
        wrongFeedbackTimeoutId = null
      }, 1000)
    }
  }

  const originalStart = () => {
    const tutorial = new Instance({
      name: 'tutorial',
      action: tutorialAction,
      painter: tutorialPainter
    })
    game.addInstance(tutorial)
    const tutorialArrow = new Instance({
      name: 'tutorial-arrow',
      action: tutorialAction,
      painter: tutorialPainter
    })
    game.addInstance(tutorialArrow)
    game.setTimeMovement(constant.bgInitMovement, 500)
    game.setTimeMovement(constant.tutorialMovement, 500)
    game.setVariable(constant.gameStartNow, true)
  }

  game.touchStartListener = (e) => {
    const coords = getCanvasCoords(e)
    if (!coords) return
    if (!selectedGrade || mathState === 'selectGrade') {
      const changed = handleGradeClick(coords.x, coords.y)
      if (changed && !game.getVariable(constant.gameStartNow)) {
        originalStart()
      }
      return
    }
    if (mathState === 'question') {
      handleAnswerClick(coords.x, coords.y)
    }
  }

  game.playBgm = () => {
    game.playAudio('bgm', true)
  }

  game.pauseBgm = () => {
    game.pauseAudio('bgm')
  }

  game.start = () => {
    if (assignmentMode && assignmentGrade) {
      selectedGrade = assignmentGrade
      mathState = 'waitingBlock'
      originalStart()
    } else {
      mathState = 'selectGrade'
    }
  }

  return game
}

