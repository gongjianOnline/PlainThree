/* eslint-disable */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
/**
 * options 参数为可配置项
 *  elementId string 挂载实例的HTML的id
 *  cameraPosition array[number] 相机的位置
 *  FPS number 帧率
 *  logarithmicDepthBuffer  boole 是否开启深度优化 默认为 false
 *  physicallyCorrectLights  boole 是否开启物理光照 默认为 false
 */
function PlainThree(options) {
  /**模型层优化 */
  var logarithmicDepthBuffer = options.logarithmicDepthBuffer && true; // 是否开启深度优化
  var physicallyCorrectLights = options.physicallyCorrectLights && true; // 是否开启物理光照
  /**优化层变量 */
  var clock = new THREE.Clock(); // 创建时钟对象
  var FPS = options.FPS || 10; // 锁死帧率在24FPS
  var renderT = 1 / FPS; //单位秒  间隔多长时间渲染渲染一次
  var timeS = 0; //如果执行一次renderer.render，timeS重新置0
  /**初始化容器变量 */
  var renderer = undefined;
  var scene = undefined;
  var camera = undefined;
  var controls = undefined;
  var group = undefined;
  /***/
  /**
 * 初始化实例
 *  options
 *    elementId string 挂载实例的HTML元素的ID
 *    cameraPosition array[number] 相机的位置
 */
  function app(options) {
    let { elementId, cameraPosition } = options;
    this.elementHtmlId = elementId;
    this.cameraPosition = cameraPosition || [0, 0, 0];
    /**初始化函数调用 */
    this.initScene();
    this.initRender();
  }

  /**创建场景 */
  app.prototype.initScene = function () {
    scene = new THREE.Scene();
    group = new THREE.Group();
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(...this.cameraPosition);
    scene.add(camera);
    // 设置光线
    const light = new THREE.AmbientLight("#ffffff");
    scene.add(light);
  };

  /**创建渲染 */
  app.prototype.initRender = function () {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.logarithmicDepthBuffer = logarithmicDepthBuffer; // 开启深度优化
    renderer.physicallyCorrectLights = physicallyCorrectLights; // 开启物理光照(性能优化)
    renderer.setSize(window.innerWidth, window.innerHeight);
    document
      .getElementById(this.elementHtmlId)
      .append(renderer.domElement);
    renderer.render(scene, camera);
    // 设置轨道器
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minPolarAngle = 0;
    // 背景光
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.background = new THREE.Color("#40504e");
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
  };

  /**更新渲染*/
  app.prototype.updateRender = function () {
    window.requestAnimationFrame(this.updateRender.bind(this));
    //获得两帧的时间间隔
    var T = clock.getDelta();
    timeS = timeS + T;
    if (timeS > renderT) {
      renderer.render(scene, camera);
      controls.update();
      timeS = 0;
    }
  };

  /**实时更新*/
  app.prototype.watchRender = function () {
    return window.requestAnimationFrame(
      app.prototype.updateRender.bind(app)
    );
  };

  /**创建场景模型 */
  /**
   * createSceneModule 创建场景方法
   * obj
   *  - rootPath string 模型根目录地址（必填，“/module/”）
   *  - moduleFile string 模型文件 （必填,"xxx.gltf"）
   *  - useData object 模型自定义数据 （必填）
   *  - moduleName string 模型名称 （必填）
   * 返回值
   *  - promise 成功返回 true 失败返回false
   */
  app.prototype.createSceneModule = function (options) {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader().setPath(options.rootPath);
      loader.load(
        options.moduleFile,
        (gltf) => {
          group.add(gltf.scene);
          scene.name = options.moduleName;
          scene.userData = options.useData;
          scene.add(group);
          app.prototype.updateRender();
          resolve(true);
        },
        () => {},
        (error) => {
          reject(error);
        }
      );
    });
  };

  /**
   * 创建物体模型
   * obj
    *  - rootPath string 模型根目录地址（必填，“/module/”）
    *  - moduleFile string 模型文件 （必填,"xxx.gltf"）
    *  - userData object 模型自定义数据 （必填）
    *  - moduleName string 模型名称 （必填）
    *  - position array 模型位置 (必填项)
  */
  app.prototype.createParts = function(options){
    return new Promise((resolve,reject)=>{
      const loader = new GLTFLoader().setPath(options.rootPath);
      loader.load(options.moduleFile, (gltf) => {
        gltf.scene.traverse((child) => {
          child.name = options.moduleName;
          child.userData = options.userData;
        });
        gltf.scene.position.x = options.position[0] || 0;
        gltf.scene.position.y = options.position[1] || 0;
        gltf.scene.position.z = options.position[2] || 0;
        group.add(gltf.scene);
        gltf.scene.name = options.moduleName;
        gltf.scene.userData = options.userData;
        scene.add(group);
        app.prototype.updateRender();
        resolve(true)
      },()=>{},(error)=>{reject(error)});
    })
  }

  /** 查找指定物体*/
  /**
   * 接收参数 
   *  - name string 根据name属性查找场景中的物体 (必填)
   */
  app.prototype.getQuery = function (name) {
    let result = group.getObjectByName(name, true); // 递归查找
    return result;
  };

  /**注册点击事件 */
  /**
   * 接受一个参数
   * event object 为点击是出发的HTMLDOM的event对象(必填)
   * 返回一个对象
   *  eventInfo Object
   *   - obj object 当前鼠标点击拾取的物体
   *   - point array 当前鼠标点击的场景坐标[x,y,z]
   */
  app.prototype.click = function (event, fn) {
    let eventInfo = {
      obj: null,
      point: null,
    };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x =
      ((event.clientX - renderer.domElement.getBoundingClientRect().left) /
        renderer.domElement.offsetWidth) *
        2 -
      1;
    mouse.y =
      -(
        (event.clientY - renderer.domElement.getBoundingClientRect().top) /
        renderer.domElement.offsetHeight
      ) *
        2 +
      1;
    raycaster.setFromCamera(mouse, camera);
    let intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      eventInfo.obj = intersects[0].object;
      eventInfo.point = intersects[0].point;
    }
    return eventInfo;
  };

  /**清除场景 */
  app.prototype.clearScene = function () {
    if (scene !== null) {
      scene.children.forEach(() => {
        scene.children.pop();
      });
    }
    const elContainer = document.getElementById(this.elementHtmlId);
    if (elContainer && elContainer.firstChild) {
      elContainer.removeChild(elContainer.firstChild);
    }
    renderer = null;
    scene = null;
    camera = null;
    controls = null;
    group = null;
  };

  /**隐藏物体 */
  /**
 * 接收参数
 *  name string 隐藏物体的 name 属性 (必填)
 *  status boole 物体的状态  (必填)
 */
  app.prototype.hideThing = function (name, status) {
    let thing = app.prototype.getQuery(name);
    thing.visible = status;
  };

  /** 创建标注*/
  /**
 * options:
 *  - name string 需要标注的物体名称 (必填)
 *  - alias string 标注别名（选填）
 *  - url string 图片的地址(线上地址) (必填)
 *  - position array[number] 标注的偏移量[x,y,z] (必填)
 *  - scale array[number] 图片的缩放大小(必填)[x,y,z]
 *  - userData object 预留属性用于存放标注的自定义属性(选填) 
 *  - thingData object 要添加标注的对象集合(必填)
 */
  app.prototype.createMarker = function(options){
    if(!(options.name && options.url && options.position && options.scale)){
      throw new Error("options参数有误,必传项不能为空")
    }
    let thingDataItem = options.thingData;
    let thing = []
    thing = thingDataItem.children.filter((o)=>{return o.name === options.name})
    if(thing.length){
      thing.forEach((item)=>{
        const textureLoader = new THREE.TextureLoader();
        const map = textureLoader.load(options.url);
        let material = new THREE.SpriteMaterial({map:map})
        let mesh = new THREE.Sprite(material)
        mesh.position.set(item.position.x + options.position[0] ,item.position.y + options.position[1], item.position.z + options.position[2])
        mesh.scale.set(...options.scale)
        mesh.name = item.alias || item.name;
        mesh.userData = options.userData || {} //自定义属性;
        group.add(mesh)
        scene.add(group);
      })
    }
  }

  /**清除指定标注 */
  /**
   * options object
   *  name string 要删除标注的name (必填)
  */
  app.prototype.clearMarker = function(options){
    group.children.forEach((item)=>{
      if(item.type === "Sprite" && options.name === item.name){
        group.remove(item);
      }
    })
  }

  return new app(options)
}

export default PlainThree;
