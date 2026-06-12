"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Environment, OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState, Suspense, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  PHONE_W,
  PHONE_H,
  deviceConfigs,
  getDeviceFromModelUrl,
  createCoverScreenCanvas,
  applyCropToImage,
  loadGltfGroup,
  cloneGroup,
  type ImageMaskConfigLike,
  parseShadowColor,
} from "@/lib/phone3d.utils";

export interface Phone3DApi {
  renderAt: (width: number, height: number) => void;
}

interface Props {
  imageUrl?: string | null;
  imageMaskConfig?: ImageMaskConfigLike | null;
  cropArea?: { x: number; y: number; width: number; height: number } | null;
  initialRotationX?: number;
  initialRotationY?: number;
  initialRotationZ?: number;
  onRotationChange?: (rx: number, ry: number) => void;
  onMount?: (canvas: HTMLCanvasElement) => void;
  onApi?: (api: Phone3DApi | null) => void;
  modelUrl?: string;
  scale?: number;
  zoom?: number;
  shadowIntensity?: number;
  shadowColor?: string;
}

// ─── Constantes y Helpers de Carga ──────────────────────────────────────────
const DEG = Math.PI / 180;
const specificGltfCache = new Map<string, Promise<THREE.Group>>();

function loadSpecificGltf(url: string): Promise<THREE.Group> {
  if (!specificGltfCache.has(url)) {
    specificGltfCache.set(
      url,
      new Promise((resolve, reject) => {
        new GLTFLoader().load(url, (gltf) => resolve(gltf.scene), undefined, reject);
      })
    );
  }
  return specificGltfCache.get(url)!;
}

function applyMetalMaterial(m: THREE.MeshStandardMaterial, matName: string): void {
  if (matName.includes("Body")) {
    m.color.set(0x787878); m.roughness = 0.18; m.metalness = 0.85; m.envMapIntensity = 1.4;
  }
  if (matName.includes("Bezel")) {
    m.color.set(0x909090); m.roughness = 0.12; m.metalness = 0.92; m.envMapIntensity = 1.6;
  }
  if (matName.includes("Buttons")) {
    m.color.set(0x999999); m.roughness = 0.15; m.metalness = 0.88; m.envMapIntensity = 1.5;
  }
  if (matName.includes("Lenses")) {
    m.color.set(0x060608); m.roughness = 0.04; m.metalness = 0.70; m.envMapIntensity = 2.0;
  }
}

// ─── Escena 3D ──────────────────────────────────────────────────────────────
function ModelScene({
  imageUrl,
  imageMaskConfig,
  cropArea,
  initialRotationX = 0,
  initialRotationY = 0,
  initialRotationZ = 0,
  onRotationChange,
  rootRef,
  cameraRef,
  zoom = 1,
  modelUrl,
  onApi,
  onLoaded,
}: Props & { 
  rootRef: React.MutableRefObject<THREE.Group | null>; 
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  onLoaded?: () => void;
}) {
  const { gl, scene, camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orbitRef = useRef<any>(null);
  const screenMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);

  const lastLoadedUrlRef = useRef<string | null>(null);
  const lastLoadedCropKeyRef = useRef<string | null>(null);
  const screenAspectRef = useRef<number>(0.459);
  const flipYRef = useRef<boolean>(false);

  // 1. Configurar la API para renderizados estáticos
  useEffect(() => {
    const api: Phone3DApi = {
      renderAt: (w, h) => {
        if (!cameraRef.current) return;
        const oldAspect = cameraRef.current.aspect;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        gl.setSize(w, h, false);
        gl.render(scene, cameraRef.current);
        cameraRef.current.aspect = oldAspect;
        cameraRef.current.updateProjectionMatrix();
        gl.setSize(gl.domElement.clientWidth || PHONE_W, gl.domElement.clientHeight || PHONE_H, false);
      },
    };
    onApi?.(api);
    return () => onApi?.(null);
  }, [onApi, gl, scene, cameraRef]);

  // 2. Lógica de Texturas
  const applyTexture = useCallback(() => {
    const mat = screenMatRef.current;
    if (!mat) return;

    const cropKey = cropArea ? JSON.stringify(cropArea) : null;

    if (!imageUrl) {
      if (mat.map) {
        mat.map.dispose();
        mat.map = null;
        mat.needsUpdate = true;
      }
      lastLoadedUrlRef.current = null;
      lastLoadedCropKeyRef.current = null;
      return;
    }

    // CLAVE DEL FIX: No solo validamos la caché, validamos que el material ACTUAL tenga la textura.
    if (
      lastLoadedUrlRef.current === imageUrl &&
      lastLoadedCropKeyRef.current === cropKey &&
      mat.map !== null
    ) {
      return;
    }

    const device = getDeviceFromModelUrl(modelUrl);
    const deviceConfig = deviceConfigs[device];
    const isDefaultPhone = device === "phone";

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const currentMat = screenMatRef.current;
      if (!currentMat) return;

      let TARGET_W = 2048;
      let TARGET_H = 0;
      let cornerRadius = 0;

      if (isDefaultPhone) {
        TARGET_W = PHONE_W * 4;
        TARGET_H = Math.round(TARGET_W / screenAspectRef.current);
      } else {
        TARGET_H = Math.round(TARGET_W / deviceConfig.aspectRatio);
        cornerRadius = Math.round(TARGET_W * deviceConfig.cornerRadiusFactor);
      }

      const cropped = applyCropToImage(img, cropArea);
      const cover = createCoverScreenCanvas(
        cropped,
        TARGET_W,
        TARGET_H,
        cornerRadius,
        imageMaskConfig
      );

      if (currentMat.map) {
        currentMat.map.dispose();
        currentMat.map = null;
      }

      const tex = new THREE.CanvasTexture(cover);
      tex.flipY = flipYRef.current;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();

      currentMat.map = tex;
      currentMat.color.set(0xffffff); // BLANCO PURO PARA REVELAR LA TEXTURA
      currentMat.needsUpdate = true;

      lastLoadedUrlRef.current = imageUrl;
      lastLoadedCropKeyRef.current = cropKey;
    };

    img.onerror = () => {
      const currentMat = screenMatRef.current;
      if (!currentMat) return;
      if (currentMat.map) {
        currentMat.map.dispose();
        currentMat.map = null;
      }
      currentMat.color.set(0x111111);
      currentMat.needsUpdate = true;
      lastLoadedUrlRef.current = imageUrl;
      lastLoadedCropKeyRef.current = cropKey;
    };

    img.src = imageUrl;
  }, [imageUrl, imageMaskConfig, cropArea, modelUrl, gl]);

  const applyTextureRef = useRef(applyTexture);
  useEffect(() => {
    applyTextureRef.current = applyTexture;
  }, [applyTexture]);

  useEffect(() => {
    applyTexture();
  }, [applyTexture]);

  // 3. Cargar el Modelo Dinámico
  useEffect(() => {
    let isMounted = true;
    const device = getDeviceFromModelUrl(modelUrl);
    const isDefaultPhone = device === "phone";

    const finalizeSetup = (group: THREE.Group) => {
      if (!isMounted) return;
      setModelGroup(group);
      
      // Retrasamos unos milisegundos para asegurar que Three ha inyectado el nodo
      setTimeout(() => {
        if (!isMounted) return;
        applyTextureRef.current(); 
        onLoaded?.();
      }, 50); 
    };

    if (isDefaultPhone) {
      flipYRef.current = false;
      loadGltfGroup().then((cached) => {
        const group = cloneGroup(cached);
        // Usamos zoom default aquí para montar el tamaño base. El useEffect dinámico hará el resto.
        const camZ = 1.5; 
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const halfH = camZ * Math.tan((40 / 2) * DEG);
        const sf = (halfH * 2 * 0.8) / size.y;
        
        group.scale.setScalar(sf);
        group.position.copy(center).negate().multiplyScalar(sf);

        group.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          const matName = (mat as THREE.Material)?.name ?? "";
          const isScreen = matName === "Screen.editable" || child.name === "Screen";

          if (isScreen) {
            const meshBox = new THREE.Box3().setFromObject(child);
            const meshSize = meshBox.getSize(new THREE.Vector3());
            if (meshSize.x > 0 && meshSize.y > 0) screenAspectRef.current = meshSize.x / meshSize.y;
            
            const basicMat = new THREE.MeshBasicMaterial({
              color: 0x111111, side: THREE.FrontSide, transparent: true, depthTest: false, depthWrite: false,
            });
            child.material = basicMat;
            child.renderOrder = 10;
            screenMatRef.current = basicMat;
          } else if (mat.isMeshStandardMaterial) {
            applyMetalMaterial(mat, matName);
          }
        });

        finalizeSetup(group);
      });
    } else {
      flipYRef.current = true;
      loadSpecificGltf(modelUrl!).then((loadedScene) => {
        const group = loadedScene.clone(true);
        const camZ = 1.5;
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const halfH = camZ * Math.tan((40 / 2) * DEG);
        const sf = (halfH * 2 * 0.8) / size.y;
        
        group.scale.setScalar(sf);
        group.position.copy(center).negate().multiplyScalar(sf);

        const deviceConfig = deviceConfigs[device];
        const planeH = 4.3 * deviceConfig.screenHeightFactor;
        const planeW = planeH * deviceConfig.aspectRatio;

        const basicMat = new THREE.MeshBasicMaterial({
          color: 0x111111, side: THREE.FrontSide, transparent: true, depthTest: false, depthWrite: false,
        });
        screenMatRef.current = basicMat;

        const plane = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), basicMat);
        plane.position.set(deviceConfig.screenOffset.x, deviceConfig.screenOffset.y, deviceConfig.screenOffset.z);
        plane.renderOrder = 10;
        group.add(plane);

        finalizeSetup(group);
      });
    }

    return () => { isMounted = false; };
  // Desactivamos exhaust-deps para que NUNCA se vuelva a ejecutar este setup al hacer zoom o cambiar onLoaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  // 4. Actualizar posiciones de cámara dinámicas (Esto es seguro de ejecutar contínuamente)
  useEffect(() => {
    const orbit = orbitRef.current;
    if (!orbit) return;
    const radius = 1.5 / zoom;
    const phi = Math.PI / 2 - initialRotationX * DEG;
    const theta = initialRotationY * DEG;
    orbit.object.position.setFromSphericalCoords(radius, phi, theta);
    orbit.update();
  }, [initialRotationX, initialRotationY, zoom]);

  useEffect(() => {
    if (rootRef.current) rootRef.current.rotation.z = initialRotationZ * DEG;
  }, [initialRotationZ]);

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault fov={40} near={0.01} far={100} position={[0, 0, 1.5 / zoom]} />
      
      <OrbitControls 
        ref={orbitRef} 
        enableZoom={false} 
        enablePan={false} 
        enableDamping 
        dampingFactor={0.08} 
        onEnd={() => {
          const orbit = orbitRef.current;
          if (!orbit || !onRotationChange) return;
          const ry = orbit.getAzimuthalAngle() * (180 / Math.PI);
          const rx = (Math.PI / 2 - orbit.getPolarAngle()) * (180 / Math.PI);
          onRotationChange(rx, ry);
        }} 
      />

      <Environment preset="city" background={false} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 6, 5]} intensity={0.6} />
      <directionalLight position={[-4, -2, 3]} intensity={0.25} color="#c8d8ff" />
      <directionalLight position={[0, -5, 5]} intensity={0.35} />

      <group ref={rootRef} rotation={[0, 0, initialRotationZ * DEG]}>
        {modelGroup && <primitive object={modelGroup} />}
      </group>
    </>
  );
}

// ─── CanvasWrapper con Loader ────────────────────────────────────────────────
function CanvasWithLoader(props: Props & {
  rootRef: React.MutableRefObject<THREE.Group | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}) {
  const [loaded, setLoaded] = useState(false);

  // CLAVE DEL FIX: onLoaded debe ser inmutable para no envenenar los hooks de la escena
  const handleLoaded = useCallback(() => setLoaded(true), []);

  return (
    <>
      <Canvas
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
        }}
        dpr={3}
        onCreated={({ gl, scene }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
          scene.environmentIntensity = 1.6;
          props.onMount?.(gl.domElement);
        }}
      >
        <Suspense fallback={null}>
          <ModelScene {...props} onLoaded={handleLoaded} />
        </Suspense>
      </Canvas>

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 4 }}>
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
    </>
  );
}

// ─── Componente Público Principal ───────────────────────────────────────────
export function Phone3DViewer(props: Props) {
  const {
    scale = 1,
    shadowIntensity = 0,
    shadowColor = "#000000",
  } = props;

  const rootRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  const t = Math.max(0, Math.min(1, shadowIntensity));
  const tEased = t * t;
  const computedBlur = tEased * 60;
  const computedOpacity = tEased * 0.7;

  const shadowRgba = shadowColor.startsWith("#")
    ? parseShadowColor(shadowColor, computedOpacity)
    : shadowColor;
  
  const hasShadow = t > 0.01;

  return (
    <div
      style={{
        display: "inline-block",
        transformOrigin: "top center",
        transform: `scale(${scale})`,
        width: PHONE_W,
        height: PHONE_H + (hasShadow ? computedBlur * 0.8 : 0),
        marginTop: "220px",
        marginLeft: "140px",
      }}
    >
      <div style={{ position: "relative", width: PHONE_W, height: PHONE_H }}>
        
        {hasShadow && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              bottom: -(computedBlur * 0.5),
              left: `${20 + tEased * 5}%`,
              width: `${60 - tEased * 10}%`,
              height: Math.max(4, computedBlur * 0.55),
              borderRadius: "50%",
              background: shadowRgba,
              filter: `blur(${Math.max(2, computedBlur * 0.6)}px)`,
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            inset: "-200px",
            zIndex: 2,
            overflow: "visible",
            cursor: grabbing ? "grabbing" : "grab",
            filter: hasShadow
              ? `drop-shadow(0px ${(tEased * 22).toFixed(1)}px ${(tEased * 32).toFixed(1)}px ${shadowRgba})`
              : "none",
            transition: "filter 0.15s ease",
            pointerEvents: "auto",
          }}
          onPointerDown={() => setGrabbing(true)}
          onPointerUp={() => setGrabbing(false)}
          onPointerLeave={() => setGrabbing(false)}
        >
          <CanvasWithLoader {...props} rootRef={rootRef} cameraRef={cameraRef} />
        </div>
      </div>
    </div>
  );
}