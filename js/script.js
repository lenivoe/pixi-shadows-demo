const app = new PIXI.Application({ width: 640, height: 640 });


document.addEventListener("DOMContentLoaded", (event) => { // Как только html загрузился
    document.body.appendChild(app.view);

    // Загружаем дополнительные файлы
    app.loader
        .add('maze', 'img/maze.png')
        .add('rocks', 'img/rocks.png')
        .add('glslVertDefault', 'glsl/default.vert')
        .add('glslShadowTexture', 'glsl/shadowmap-texture.frag')
        .add('glslFragShadowCast', 'glsl/shadow_cast.frag')
        .load(setup);
});

function setup() {
    const rocksSprite = new PIXI.Sprite(app.loader.resources.rocks.texture); // Отбрасывающая тень картинка с объектами (черным)
    rocksSprite.width = app.screen.width
    rocksSprite.height = app.screen.height


    const CONST_LIGHTS_COUNT = 3;
    const lights = []; // Лампочки
    for (let i = 0; i < CONST_LIGHTS_COUNT; i++) {
        const light = new PIXI.Graphics();
        light.beginFill(0xFFFF00);
        light.drawCircle(0, 0, 4); // x, y, radius
        light.endFill();
        light.x = app.screen.x + Math.random() * app.screen.width;
        light.y = app.screen.y + Math.random() * app.screen.height;
        light.pivot.set(0.5)
        light.interactive = true;
        light.buttonMode = true;
        light
            .on('pointerdown', onDragStart)
            .on('pointerup', onDragEnd)

        lights.push(light);
    }


    const shadowedRT = PIXI.RenderTexture.create({ width: rocksSprite.width, height: rocksSprite.height });
    const shadowedSprite = new PIXI.Sprite(shadowedRT);
    shadowedSprite.x = 0
    shadowedSprite.y = 0
    shadowedSprite.width = app.screen.width
    shadowedSprite.height = app.screen.height

    const shadowmapFilter = createShadowmapFilter(lights);
    shadowedSprite.filters = [shadowmapFilter];


    const fpsText = new PIXI.Text('FPS: ???');
    fpsText.position.set(app.screen.width - 160, 0);

    app.stage.addChild(shadowedSprite);
    lights.forEach(light => app.stage.addChild(light));
    app.stage.addChild(fpsText);


    const fpsHistory = [];
    app.ticker.add((delta) => {
        fpsHistory.push(app.ticker.FPS);
        if (fpsHistory.length > 20) {
            fpsHistory.shift();
        }
        fpsText.text = `FPS: ${fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length}`

        shadowmapFilter.uniforms.uLightPosList = lights.flatMap(light => [light.x, light.y])

        app.renderer.render(rocksSprite, shadowedRT, true);
    });
}

function onDragStart(event) {
    // store a reference to the data
    // the reason for this is because of multitouch
    // we want to track the movement of this particular touch
    this.data = event.data;
    this.dragging = true;
    this.on('pointermove', onDragMove);
}

function onDragEnd() {
    // set the interaction data to null
    this.data = null;
    this.dragging = false;
    this.removeListener('pointermove', onDragMove);
}

function onDragMove() {
    if (this.dragging) {
        const newPosition = this.data.getLocalPosition(this.parent);
        this.x = newPosition.x;
        this.y = newPosition.y;
    }
}

function createShadowmapFilter(lights) {
    const defaultVertSrc = app.loader.resources.glslVertDefault.data;
    let shadowCastFragSrc = app.loader.resources.glslFragShadowCast.data;
    // shadowCastFragSrc = shadowCastFragSrc.replace(
    //     /(const\s+int\s+LIGHT_MAX_AMOUNT\s*=\s*)\d+(\s*;)/,
    //     `$1${lights.length}$2`
    // );

    const shadowmapFilter = new PIXI.Filter(defaultVertSrc, shadowCastFragSrc, {
        uLightAmount: lights.length,
        uAmbient: 0.3,
        uScreenSize: [app.screen.width, app.screen.height],
        uLightPosList: lights.flatMap(light => [light.x, light.y]),
        uLightRadiusList: lights.map((light, i) => (lights.length - i) * 100),
        uLightColorList: lights.flatMap((light, i) => {
            const colors = [[0.4, 0.4, 0.4, 1], [0.4, 0, 0, 1], [0, 0.4, 0, 1], [0, 0, 0.4, 1]]
            return colors[i % colors.length]
        })
    });

    return shadowmapFilter;
}
