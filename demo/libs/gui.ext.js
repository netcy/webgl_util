function createGUI (scene) {
  var gui = new dat.GUI();
  var config = {
    clearColor: convertGLColorToRGB(scene.getClearColor()),
    clearAlpha: scene.getClearColor()[3] * 255,
    ambientColor: convertGLColorToRGB(scene.getAmbientColor()),
    lightColor: convertGLColorToRGB(scene.getLightColor()),
  };
  var sceneFolder = gui.addFolder('Scene');
  addGUIColor(sceneFolder, 'clearColor', 'Clear Color');
  sceneFolder
    .add(config, 'clearAlpha', 0, 255, 1)
    .name('Clear Alpha')
    .onChange(function (value) {
      value = value / 255;
      scene.getClearColor()[3] = value;
      scene.setClearColor(scene.getClearColor());
  });
  addGUIColor(sceneFolder, 'ambientColor', 'Ambient Color');
  addGUIColor(sceneFolder, 'lightColor', 'Light Color');
  addGUIPosition(sceneFolder, scene, 'lightPosition', 'Light Position');
  addGUIValue(sceneFolder, scene, 'enableSSAO', 'Enable SSAO');
  // sceneFolder.open();

  var cameraFolder = gui.addFolder('Camera');
  var camera = scene.getCamera();
  addGUIPosition(cameraFolder, camera, 'position', 'Position');
  addGUIPosition(cameraFolder, camera, 'target', 'Target');
  addGUIValue(cameraFolder, camera, 'near', 'Near');
  addGUIValue(cameraFolder, camera, 'far', 'Far');
  addGUIValue(cameraFolder, camera, 'fovy', 'Fovy');
  // cameraFolder.open();

  function addGUIColor (gui, property, name) {
    var orgValue = scene['get' + property[0].toUpperCase() + property.substr(1)]();
    gui.addColor(config, property).onChange(function (value) {
      value = convertRGBToGLColor(value);
      orgValue[0] = value[0];
      orgValue[1] = value[1];
      orgValue[2] = value[2];
      scene['set' + property[0].toUpperCase() + property.substr(1)](orgValue);
    }).name(name);
  }

  function addGUIPosition (gui, object, property, name) {
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

  function addGUIValue (gui, object, property, name) {
    gui.add(object, '_' + property)
      .name(name)
      .onChange(function (value) {
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
