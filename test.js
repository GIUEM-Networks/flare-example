let canvas = document.getElementById('canvas')
let container = document.getElementById('container')

let ViewCenter, ViewHeight, ViewWidth

let graphics, actor, actorInstance
let lastAdvanceTime

let dpr = () => window.devicePixelRatio || 1.0

let mouseIn = false

let animations = []
let globalSpeed = 1

let globalToFlareWorld = glMatrix.mat2d.create()
let eyeCtrl
let eyeOrigin = glMatrix.vec2.create(), eyeOriginLocal = glMatrix.vec2.create()
let caretGlobal = glMatrix.vec2.create(), caretWorld = glMatrix.vec2.create()

let vt = glMatrix.mat2d.create()

async function init() {
  graphics = new Flare.Graphics(canvas)
  // 初始化 lib
  await new Promise(resolve => graphics.initialize(() => {
    resolve()
  }, 'https://cdn.jsdelivr.net/gh/GIUEM-Networks/flare-example/lib/'))

  // 加载 flare
  actor = await load('./Bob (Minion) (1).flr')

  // 初始化 actor
  actorInstance = actor.makeInstance()
  actorInstance.initialize(graphics)

  // 初始化动画
  if (actorInstance.animations.length) {
    animations = actorInstance.animations.map(animation => ({
      animation,
      animationInstance: new Flare.AnimationInstance(animation._Actor, animation),
      speed: 1.0,
      mix: 1.0,
      play: false
    }))
  }

  let aabb = actorInstance.artboardAABB()
  ViewCenter = [(aabb[0] + aabb[2]) / 2, (aabb[1] + aabb[3]) / 2]
  ViewHeight = aabb[2] - aabb[0]
  ViewWidth = aabb[3] - aabb[1]

  eyeCtrl = actorInstance.getNode('eye_ctrl')
  eyeOrigin = eyeCtrl.worldTranslation
  glMatrix.vec2.copy(eyeOriginLocal, eyeCtrl.translation)

  lastAdvanceTime = performance.now()

  canvas.addEventListener('touchstart', e => {
    mouseIn = true
  })

  canvas.addEventListener('touchmove', e => {
    caretGlobal[0] = e.touches[0].clientX
    caretGlobal[1] = e.touches[0].clientY
  })

  canvas.addEventListener('touchend', () => mouseIn = false)
  canvas.addEventListener('touchcancel', () => mouseIn = false)

  // canvas.addEventListener('mousemove', (e) => {
  //   mouseIn = true
  //   caretGlobal[0] = e.clientX
  //   caretGlobal[1] = e.clientY
  // })

  // canvas.addEventListener('mouseout', () => {
  //   mouseIn = false
  //   // reset
  // })

  advance();
}

// 运行动画
function advance() {
  requestAnimationFrame(() => advance())

  const now = performance.now()
  const elapsed = (now - lastAdvanceTime) / 1000
  lastAdvanceTime = now

  // resize to fit window
  // setSize(window.innerWidth, window.innerHeight * 0.5)
  setSize(document.body.clientWidth, document.body.clientHeight * 0.7)
  let w = graphics.viewportWidth, h = graphics.viewportHeight
  // scale to contain
  let scale = Math.min(w / ViewWidth, h / ViewHeight)
  vt[0] = scale
  vt[3] = scale
  vt[4] = -ViewCenter[0] * scale + w / 2
  vt[5] = -ViewCenter[1] * scale + h / 2

  let targetTranslation
  if (mouseIn) {
    // transform
    glMatrix.vec2.transformMat2d(caretWorld, caretGlobal, globalToFlareWorld)
    // 计算方向向量
    let toCaret = glMatrix.vec2.subtract(glMatrix.vec2.create(), caretWorld, eyeOriginLocal)
    // 归一化
    glMatrix.vec2.normalize(toCaret, toCaret)
    glMatrix.vec2.scale(toCaret, toCaret, 200)

    let toFaceTransform = glMatrix.mat2d.create()
    if (glMatrix.mat2d.invert(toFaceTransform, eyeCtrl.parent.worldTransform)) {
      glMatrix.vec2.transformMat2(toCaret, toCaret, toFaceTransform)
      targetTranslation = glMatrix.vec2.add(glMatrix.vec2.create(), toCaret, eyeOriginLocal)
    }
  } else {
    targetTranslation = glMatrix.vec2.clone(eyeOriginLocal)
  }

  let diff = glMatrix.vec2.subtract(glMatrix.vec2.create(), targetTranslation, eyeCtrl.translation)
  let frameTranslation = glMatrix.vec2.add(glMatrix.vec2.create(), eyeCtrl.translation, glMatrix.vec2.scale(diff, diff, Math.min(1.0, elapsed * 5.0)))

  eyeCtrl.translation = frameTranslation

  if (animations.length > 0) {
    // animations[0].animationInstance.time += elapsed
    // animations[0].animationInstance.apply(actorInstance, 1.0)
    animations.forEach(({animationInstance, play, speed, mix}, idx) => {
      if (play) {
        animationInstance.time += elapsed * globalSpeed
        animationInstance.apply(actorInstance, mix)
      }
    })
  }

  // next
  if (actorInstance) {
    // 运行动画
    actorInstance.advance(elapsed)
  }

  draw()
  render()
}

// 将动画应用到 canvas
function draw() {
  if (!actorInstance) return

  glMatrix.mat2d.invert(globalToFlareWorld, vt)
  graphics.setView(vt)
  actorInstance.draw(graphics)
  graphics.flush()
}

function load(url) {
  const loader = new Flare.ActorLoader()
  return new Promise((resolve, reject) => {
    loader.load(url, (actor) => {
      if (!actor || actor.error) {
        reject(!actor ? null : actor.error)
      } else {
        resolve(actor)
      }
    }) 
  })
}

function setSize(width, height) {
  graphics.setSize(width, height)
}

function render() {
  const {html, render: r} = htmPreact;
  r(html`
    <div>
      <div class="d-flex" style="justify-content: space-between">
        ${animations.map((obj) => (
          html`
          <label class="form-switch"> 
            <input type="checkbox" checked="${obj.play}" onInput=${(e) => {
              obj.play = e.target.checked
            }} />
            ${obj.animation.name} <i class="form-icon"></i> 
          </label>`
        ))}
      </div>
      <div class="d-flex" style="align-items: center">
        <label class="form-label" for="speed">Speed</label>
        <input 
          class="slider" type="range"
          style="margin: 0 0.5em"
          min="0" max="5" step="0.1"
          value="${globalSpeed}"
          onInput=${(e) => {
            if (e.target.value) {
              globalSpeed = e.target.value
            }
          }}
        />
        <span>${globalSpeed}</span>
      </div>

      <div class="text-center">
        <button class="btn btn-link" onClick=${() => {
            animations.forEach(o => o.play = false)
          }}>Pause</button>
        <button class="btn btn-link" onClick=${() => {
          globalSpeed = 1
          animations.forEach(o => o.play = false)
        }}>Reset</button>
      </div>
    </div>
  `, container)
}

init().then(() => {
  console.log('loaded!')
})
