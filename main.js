import { html, render } from 'https://cdn.jsdelivr.net/npm/htm@2.2.1/preact/standalone.module.js';

let canvas = document.getElementById('canvas')
let container = document.getElementById('container')

let graphics, actor, actorInstance
let lastAdvanceTime

let animations = []

async function init() {
  graphics = new Flare.Graphics(canvas)
  // 初始化 lib
  await new Promise(resolve => graphics.initialize(() => {
    resolve()
  }, './lib'))

  // 加载 flare
  actor = await load('./Bob (Minion).flr')

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

  lastAdvanceTime = performance.now()

  advance();
}

// 运行动画
function advance() {
  requestAnimationFrame(() => advance())

  const now = performance.now()
  const elapsed = (now - lastAdvanceTime) / 1000
  lastAdvanceTime = now

  // first
  if (animations.length > 0) {
    // animations[0].animationInstance.time += elapsed
    // animations[0].animationInstance.apply(actorInstance, 1.0)
    animations.forEach(({animationInstance, play, speed, mix}, idx) => {
      if (play) {
        animationInstance.time += elapsed * speed
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

  _render()
}

// 将动画应用到 canvas
function draw() {
  if (!actorInstance) return

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

function _render() {
  render(html`
    <div class="columns">
      ${animations.map((obj) => (
        html`
          <div class="column col-3">
            <div class="card">
              <div class="card-header">
                <div class="card-title">${obj.animation.name}</div>
              </div>
              <div class="card-body">
                <form class="form-group">
                  <!-- 播放 -->
                  <label class="form-switch">
                    <input type="checkbox" checked="${obj.play}" onInput=${(e) => {
                      obj.play = e.target.checked
                    }} />
                    <i class="form-icon"></i> Play
                  </label>
                  <!-- 速度 -->
                  <label class="form-label" for="speed">Speed: ${obj.speed}</label>
                  <input 
                    class="slider tooltip" type="range"
                    min="-10" max="10" step="0.01"
                    value="${obj.speed}" data-tooltip="${obj.speed}"
                    onInput=${(e) => {
                      if (e.target.value) {
                        obj.speed = e.target.value
                      }
                    }}
                  />
                  <!-- Mix -->
                  <label class="form-label" for="mix">Mix: ${obj.mix}</label>
                  <input 
                    class="slider tooltip" type="range"
                    min="-10" max="10" step="0.01"
                    value="${obj.mix}" data-tooltip="${obj.mix}"
                    onInput=${(e) => {
                      if (e.target.value) {
                        obj.mix = e.target.value
                      }
                    }}
                  />
                </form>
              </div>
              <div class="card-body">
                <button class="btn" onClick=${() => {
                  obj.speed = 1
                  obj.mix = 1
                  obj.play = false
                  obj.animationInstance.time = 0
                  obj.animationInstance.apply(actorInstance, 1)
                }}>Reset</button>
              </div>
            </div>
          </div>
        `
      ))}
    </div>
  `, container)
}



init().then(() => {
  // _render()
})
