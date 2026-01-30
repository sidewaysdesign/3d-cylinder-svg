import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/exporters/STLExporter.js";

const canvas = document.querySelector("#viewport");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0a0c12");

const camera = new THREE.PerspectiveCamera(40, 1, 1, 1000);
camera.position.set(0, 120, 220);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const ambient = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
keyLight.position.set(120, 180, 120);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x7bd4ff, 0.5);
rimLight.position.set(-120, 80, -150);
scene.add(rimLight);

const textureLoader = new THREE.TextureLoader();
const defaultSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7bd4ff" />
      <stop offset="1" stop-color="#4b7dff" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#0f1117" />
  <circle cx="256" cy="256" r="200" fill="none" stroke="url(#grad)" stroke-width="18" />
  <path d="M128 300 Q256 120 384 300" fill="none" stroke="#7bd4ff" stroke-width="16" stroke-linecap="round" />
  <text x="50%" y="56%" text-anchor="middle" font-family="Verdana" font-size="46" fill="#f5f7ff">Relief</text>
</svg>`;

const state = {
  height: 140,
  diameter: 100,
  thickness: 18,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  showRelief: true,
  texture: null,
};

const baseMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.4,
  metalness: 0.1,
});

const reliefMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.35,
  metalness: 0.1,
  transparent: true,
  opacity: 0.25,
});

const group = new THREE.Group();
scene.add(group);

let baseCylinder = null;
let reliefCylinder = null;

const createCylinder = (radius, height, material, openEnded = true) => {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 128, 1, openEnded);
  geometry.rotateY(Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
};

const updateCylinders = () => {
  const radius = state.diameter / 2;
  const reliefRadius = radius + state.thickness;
  const height = state.height;

  if (baseCylinder) group.remove(baseCylinder);
  if (reliefCylinder) group.remove(reliefCylinder);

  baseCylinder?.geometry.dispose();
  reliefCylinder?.geometry.dispose();

  baseCylinder = createCylinder(radius, height, baseMaterial, true);
  reliefCylinder = createCylinder(reliefRadius, height, reliefMaterial, true);

  group.add(baseCylinder);
  if (state.showRelief) group.add(reliefCylinder);
};

const updateTextureMapping = () => {
  if (!state.texture) return;

  const repeatValue = 1 / state.scale;
  state.texture.wrapS = THREE.RepeatWrapping;
  state.texture.wrapT = THREE.RepeatWrapping;
  state.texture.repeat.set(repeatValue, repeatValue);
  state.texture.offset.set(state.offsetX, state.offsetY);
  state.texture.needsUpdate = true;
};

const applyTexture = (texture) => {
  state.texture = texture;
  baseMaterial.map = texture;
  reliefMaterial.map = texture;
  baseMaterial.needsUpdate = true;
  reliefMaterial.needsUpdate = true;
  updateTextureMapping();
};

const loadSvgTexture = (svgText) => {
  const encoded = encodeURIComponent(svgText)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  const dataUrl = `data:image/svg+xml,${encoded}`;
  textureLoader.load(dataUrl, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    applyTexture(texture);
  });
};

const resize = () => {
  const { clientWidth, clientHeight } = canvas.parentElement;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
};

const animate = () => {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

const registerSlider = (
  id,
  key,
  formatter = (value) => value,
  { updateGeometry = true, updateTexture = true } = {},
) => {
  const input = document.querySelector(`#${id}`);
  const display = document.querySelector(`#${id}Value`);

  const update = () => {
    state[key] = Number(input.value);
    display.textContent = formatter(state[key]);
    if (updateGeometry) updateCylinders();
    if (updateTexture) updateTextureMapping();
  };

  input.addEventListener("input", update);
  update();
};

const svgInput = document.querySelector("#svgInput");
const svgName = document.querySelector("#svgName");

svgInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    loadSvgTexture(reader.result);
    svgName.textContent = `Loaded: ${file.name}`;
  };
  reader.readAsText(file);
});

const reliefToggle = document.querySelector("#reliefToggle");
reliefToggle.addEventListener("change", (event) => {
  state.showRelief = event.target.checked;
  updateCylinders();
});

const exporter = new STLExporter();
const exportButton = document.querySelector("#export");
exportButton.addEventListener("click", () => {
  const exportGroup = new THREE.Group();
  const radius = state.diameter / 2;
  const reliefRadius = radius + state.thickness;
  const height = state.height;
  exportGroup.add(createCylinder(radius, height, baseMaterial, false));
  if (state.showRelief) {
    exportGroup.add(createCylinder(reliefRadius, height, reliefMaterial, false));
  }

  const stlData = exporter.parse(exportGroup, { binary: true });
  const blob = new Blob([stlData], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "svg-cylinder-relief.stl";
  link.click();
  URL.revokeObjectURL(url);
});

registerSlider("height", "height", (value) => `${value.toFixed(0)} mm`, {
  updateTexture: false,
});
registerSlider("diameter", "diameter", (value) => `${value.toFixed(0)} mm`, {
  updateTexture: false,
});
registerSlider("thickness", "thickness", (value) => `${value.toFixed(0)} mm`, {
  updateTexture: false,
});
registerSlider(
  "scale",
  "scale",
  (value) => `${value.toFixed(2)}x`,
  { updateGeometry: false },
);
registerSlider("offsetX", "offsetX", (value) => value.toFixed(2), {
  updateGeometry: false,
});
registerSlider("offsetY", "offsetY", (value) => value.toFixed(2), {
  updateGeometry: false,
});

loadSvgTexture(defaultSvg);
updateCylinders();
resize();
animate();

window.addEventListener("resize", resize);
