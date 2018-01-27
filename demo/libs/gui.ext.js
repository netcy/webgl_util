function createGUI (scene) {
  var gui = new dat.GUI();
  var config = {
    clearColor: convertGLColorToRGB(scene.getClearColor()),
    clearAlpha: scene.getClearColor()[3] * 255,
    ambientColor: convertGLColorToRGB(scene.getAmbientColor()),
    lightColor: convertGLColorToRGB(scene.getLightColor()),
    // wireframeColor: convertGLColorToRGB(scene.getWireframeColor()),

    // glowColor: convertGLColorToRGB(scene._glowEffect.getGlowColor()),
    // outlineColor: convertGLColorToRGB(scene._outlineEffect.getOutlineColor()),
    loadGLTF: function () {
      // http://www.richardkotze.com/top-tips/how-to-open-file-dialogue-just-using-javascript
      var fileSelector = document.createElement('input');
      fileSelector.setAttribute('type', 'file');
      fileSelector.onchange = function(e) {
        var name = fileSelector.files[0].name;
        if (name.endsWith('.gltf')) {
          scene.clear();
          name = name.substr(0, name.length - 5);
          scene.loadGLTF('./gltf/2.0/' + name + '/gltf/', name);
        }
      };
      fileSelector.click();
    },
  };
  var sceneFolder = gui.addFolder('Scene');
  addGUIColor(sceneFolder, config, scene, 'clearColor', 'Clear Color');
  sceneFolder
    .add(config, 'clearAlpha', 0, 255, 1)
    .name('Clear Alpha')
    .onChange(function (value) {
      value = value / 255;
      scene.getClearColor()[3] = value;
      scene.setClearColor(scene.getClearColor());
  });
  addGUIColor(sceneFolder, config, scene, 'ambientColor', 'Ambient Color');
  addGUIColor(sceneFolder, config, scene, 'lightColor', 'Light Color');
  addGUIPosition(sceneFolder, config, scene, 'lightPosition', 'Light Position');
  addGUIValue(sceneFolder, scene, 'enableSSAO', 'Enable SSAO');

  /*var wireframeFolder = sceneFolder.addFolder('Wireframe');
  addGUIColor(wireframeFolder, config, scene, 'wireframeColor', 'Color');
  addGUIValue(wireframeFolder, scene, 'wireframeWidth', 'Width', {
    min: 0,
    max: 5.0,
    step: 0.5
  });
  addGUIValue(wireframeFolder, scene, 'wireframeOnly', 'Only');*/

  // addGUIPosition4(sceneFolder, config, scene, 'clipPane', 'Clip Pane');

  var cameraFolder = gui.addFolder('Camera');
  var camera = scene.getCamera();
  // TODO update gui value when scene changed
  addGUIPosition(cameraFolder, config, camera, 'position', 'Position');
  addGUIPosition(cameraFolder, config, camera, 'target', 'Target');
  addGUIValue(cameraFolder, camera, 'near', 'Near');
  addGUIValue(cameraFolder, camera, 'far', 'Far');
  addGUIValue(cameraFolder, camera, 'fovy', 'Fovy');

  /*var glowFolder = gui.addFolder('Glow');
  var glowEffect = scene._glowEffect;
  addGUIColor(glowFolder, config, glowEffect, 'glowColor', 'Glow Color');
  addGUIValue(glowFolder, glowEffect, 'blurAmount', 'Blur Amount', {
    min: 0,
    max: 20,
    step: 1
  });
  addGUIValue(glowFolder, glowEffect, 'blurScale', 'Blur Scale', {
    min: 0,
    max: 10,
    step: 0.1
  });
  addGUIValue(glowFolder, glowEffect, 'blurStrength', 'Blur Strength', {
    min: 0,
    max: 1,
    step: 0.1
  });
  addGUIValue(glowFolder, glowEffect, 'blurSize', 'Blur Size', {
    '64*64': 64,
    '128*128': 128,
    '256*256': 256,
    '512*512': 512,
    '1024*1024': 1024,
  });

  var outlineFolder = gui.addFolder('Outline');
  var outlineEffect = scene._outlineEffect;
  addGUIColor(outlineFolder, config, outlineEffect, 'outlineColor', 'outline Color');
  addGUIValue(outlineFolder, outlineEffect, 'outlineWidth', 'Outline Width', {
    min: 0,
    max: 20,
    step: 1
  });
  addGUIValue(outlineFolder, outlineEffect, 'outlineGap', 'Outline Gap', {
    min: 0,
    max: 20,
    step: 1
  });*/

  var vrFolder = gui.addFolder('VR');
  vrFolder.add(scene, 'enterVR').name('Enter VR');
  vrFolder.add(scene, 'exitVR').name('Exit VR');

  gui.add(scene, 'enterFullscreen').name('Full Screen');
  gui.add(scene, 'clear').name('Clear');
  gui.add(config, 'loadGLTF').name('Load GLTF');

  function addGUIColor (gui, config, object, property, name) {
    var orgValue = object['get' + property[0].toUpperCase() + property.substr(1)]();
    gui.addColor(config, property).onChange(function (value) {
      value = convertRGBToGLColor(value);
      orgValue[0] = value[0];
      orgValue[1] = value[1];
      orgValue[2] = value[2];
      object['set' + property[0].toUpperCase() + property.substr(1)](orgValue);
    }).name(name);
  }

  function addGUIPosition (gui, config, object, property, name) {
    var positionFoler = gui.addFolder(name);
    var orgValue = object['get' + property[0].toUpperCase() + property.substr(1)]();
    addPosition('x', 0);
    addPosition('y', 1);
    addPosition('z', 2);

    function addPosition (name, index) {
      config[property + '_' + name] = orgValue[index];
      positionFoler.add(config, property + '_' + name).onChange(function (value) {
        orgValue[index] = value;
        object['set' + property[0].toUpperCase() + property.substr(1)](orgValue);
      }).name(name);
    }
  }

  function addGUIPosition4 (gui, config, object, property, name) {
    var positionFoler = gui.addFolder(name);
    var orgValue = object['get' + property[0].toUpperCase() + property.substr(1)]();
    addPosition('x', 0);
    addPosition('y', 1);
    addPosition('z', 2);
    addPosition('d', 3);

    function addPosition (name, index) {
      config[property + '_' + name] = orgValue[index];
      positionFoler.add(config, property + '_' + name).onChange(function (value) {
        orgValue[index] = value;
        object['set' + property[0].toUpperCase() + property.substr(1)](orgValue);
      }).name(name);
    }
  }

  function addGUIValue (gui, object, property, name, options) {
    var item;
    if (options && options.min != null) {
      item = gui.add(object, '_' + property, options.min, options.max, options.step);
    } else {
      item = gui.add(object, '_' + property, options);
    }
    return item.name(name).onChange(function (value) {
      object['set' + property[0].toUpperCase() + property.substr(1)](value);
    });
  }

  return gui;
}

function convertGLColorToRGB (color) {
  return color.map(function (c) {
    return c * 255;
  }).slice(0, 3);
}

function convertRGBToGLColor (color) {
  return color.map(function (c) {
    return c / 255;
  });
}
