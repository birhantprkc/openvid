"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Environment, OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState, Suspense, useCallback, useLayoutEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  PHONE_W,
  PHONE_H,
  createCoverScreenCanvas,
  applyCropToImage,
  type ImageMaskConfigLike,
  parseShadowColor,
} from "@/lib/phone3d.utils";
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { ControlsPopup } from "@/components/ui/ControlsPopup";
import { EnvironmentPreset, ViewerControls3D } from "@/lib/viewer-controls3d";

export interface DoubleIPhone3DApi {
  renderAt: (width: number, height: number) => void;
  restorePreview: () => void;
  hasBuiltInShadow: boolean;
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
  onApi?: (api: DoubleIPhone3DApi | null) => void;
  scale?: number;
  zoom?: number;
  shadowIntensity?: number;
  shadowColor?: string;
  videoElement?: HTMLVideoElement | null;
}

const DEG = Math.PI / 180;
const PLACEHOLDER_PHONE_URL = "/images/mockups-3d/placeholder-phone.avif";
const MODEL_URL = "/models/double_iphone_13_pro.glb";

let cachedDoublePhonePromise: Promise<THREE.Group> | null = null;

function loadDoubleIPhoneGltf(): Promise<THREE.Group> {
  if (!cachedDoublePhonePromise) {
    cachedDoublePhonePromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(MODEL_URL, (gltf) => resolve(gltf.scene), undefined, reject);
    });
  }
  return cachedDoublePhonePromise;
}

function ModelScene({
  imageUrl,
  imageMaskConfig,
  cropArea,
  initialRotationX = -58.23,
  initialRotationY = -29,
  initialRotationZ = 0,
  onRotationChange,
  rootRef,
  cameraRef,
  zoom = 1,
  onApi,
  onLoaded,
  videoElement,
}: Props & {
  rootRef: React.MutableRefObject<THREE.Group | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  onLoaded?: () => void;
}) {
  const { gl, scene, camera } = useThree();
  const orbitRef = useRef<OrbitControlsType | null>(null);
  const screenMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);

  const lastLoadedUrlRef = useRef<string | null>(null);
  const lastLoadedCropKeyRef = useRef<string | null>(null);

  const onApiRef = useRef(onApi);
  useLayoutEffect(() => {
    onApiRef.current = onApi;
  });

  const { autoRotate, rotationSpeed, glow, environment } = ViewerControls3D({
    defaultEnvironment: "studio",
    defaultGlow: 3.0,
  });

  useFrame(() => {
    if (videoElement && videoTextureRef.current) {
      videoTextureRef.current.needsUpdate = true;
    }
  });

  useEffect(() => {
    const capturedOnApi = onApiRef.current;
    const RENDER_PIXEL_RATIO = 2;

    const api: DoubleIPhone3DApi = {
      renderAt: (w, h) => {
        const cam = cameraRef.current ?? camera;
        if (!cam) return;
        const maxTexSize = gl.capabilities.maxTextureSize || 4096;
        const maxDim = Math.floor(maxTexSize / RENDER_PIXEL_RATIO) - 1;
        const safeW = Math.max(1, Math.min(Math.round(w), maxDim));
        const safeH = Math.max(1, Math.min(Math.round(h), maxDim));

        (cam as THREE.PerspectiveCamera).aspect = safeW / safeH;
        (cam as THREE.PerspectiveCamera).updateProjectionMatrix();

        gl.setPixelRatio(RENDER_PIXEL_RATIO);
        gl.setSize(safeW, safeH, false);
        if (videoTextureRef.current) videoTextureRef.current.needsUpdate = true;
        gl.render(scene, cam);
      },
      restorePreview: () => {
        const cam = cameraRef.current ?? camera;
        if (!cam) return;
        const freshW = gl.domElement.clientWidth;
        const freshH = gl.domElement.clientHeight;

        (cam as THREE.PerspectiveCamera).aspect = freshW / freshH;
        (cam as THREE.PerspectiveCamera).updateProjectionMatrix();

        gl.setPixelRatio(3);
        gl.setSize(freshW, freshH, false);
      },
      hasBuiltInShadow: true,
    };

    capturedOnApi?.(api);
    return () => capturedOnApi?.(null);
  }, [gl, scene, camera, cameraRef]);

  const applyTexture = useCallback(() => {
    if (videoElement) return;
    const mat = screenMatRef.current;
    if (!mat) return;

    const cropKey = cropArea ? JSON.stringify(cropArea) : null;
    const targetImgUrl = imageUrl || PLACEHOLDER_PHONE_URL;

    if (
      lastLoadedUrlRef.current === targetImgUrl &&
      lastLoadedCropKeyRef.current === cropKey &&
      mat.map !== null
    ) {
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const currentMat = screenMatRef.current;
      if (!currentMat) return;

      const TARGET_W = 1080;
      const TARGET_H = 2340;

      const sourceImg = cropArea ? applyCropToImage(img, cropArea) : img;
      const cover = createCoverScreenCanvas(sourceImg, TARGET_W, TARGET_H, 0, imageMaskConfig);

      if (currentMat.map) {
        currentMat.map.dispose();
      }

      const tex = new THREE.CanvasTexture(cover);
      tex.flipY = true;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();

      currentMat.map = tex;
      currentMat.color.set(0xffffff);
      currentMat.needsUpdate = true;

      lastLoadedUrlRef.current = targetImgUrl;
      lastLoadedCropKeyRef.current = cropKey;
    };
    img.onerror = () => {
      if (mat.map) mat.map.dispose();
      mat.color.set(0x111111);
      mat.needsUpdate = true;
    };
    img.src = targetImgUrl;
  }, [imageUrl, imageMaskConfig, cropArea, gl, videoElement]);

  const applyVideoTextureIfReady = useCallback(() => {
    const mat = screenMatRef.current;
    const tex = videoTextureRef.current;

    if (mat && tex) {
      if (mat.map && mat.map !== tex) {
        mat.map.dispose();
      }
      tex.flipY = false;
      tex.needsUpdate = true;
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    }
  }, []);

  useEffect(() => {
    if (!videoElement) {
      if (videoTextureRef.current) {
        videoTextureRef.current.dispose();
        videoTextureRef.current = null;
      }
      return;
    }

    const tex = new THREE.VideoTexture(videoElement);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    if (videoTextureRef.current) {
      videoTextureRef.current.dispose();
    }
    videoTextureRef.current = tex;

    applyVideoTextureIfReady();

    return () => {
      if (videoTextureRef.current === tex) {
        videoTextureRef.current = null;
      }
      tex.dispose();
    };
  }, [videoElement, applyVideoTextureIfReady]);

  const applyTextureRef = useRef(applyTexture);
  useEffect(() => {
    applyTextureRef.current = applyTexture;
  }, [applyTexture]);

  useEffect(() => {
    applyTexture();
  }, [applyTexture]);

  useEffect(() => {
    let isMounted = true;

    const finalizeSetup = (group: THREE.Group) => {
      if (!isMounted) return;
      setModelGroup(group);
      setTimeout(() => {
        if (!isMounted) return;
        applyTextureRef.current();
        onLoaded?.();
      }, 50);
    };

    loadDoubleIPhoneGltf().then((loadedScene) => {
      const group = loadedScene.clone(true);

      const camZ = 1.5;
      const box = new THREE.Box3().setFromObject(group);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const halfH = camZ * Math.tan((40 / 2) * DEG);
      const sf = (halfH * 2 * 0.55) / size.y;

      group.scale.setScalar(sf);
      group.position.copy(center).negate().multiplyScalar(sf);

      const basicMat = new THREE.MeshBasicMaterial({
        color: 0x111111,
        side: THREE.FrontSide,
        transparent: false,
        depthTest: true,
        depthWrite: true,
      });

      screenMatRef.current = basicMat;
      applyVideoTextureIfReady();

      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.name === "Object_13" || child.name === "Object_26") {
            child.material = basicMat;
          }
        }
      });

      finalizeSetup(group);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const prevRotationRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (
      prevRotationRef.current?.x === initialRotationX &&
      prevRotationRef.current?.y === initialRotationY
    ) {
      return;
    }

    const id = setTimeout(() => {
      const orbit = orbitRef.current;
      if (!orbit) return;

      const radius = 1.5 / zoom;
      const phi = Math.PI / 2 - initialRotationX * DEG;
      const theta = initialRotationY * DEG;

      orbit.object.position.setFromSphericalCoords(radius, phi, theta);
      orbit.update();

      prevRotationRef.current = { x: initialRotationX, y: initialRotationY };
    }, 0);

    return () => clearTimeout(id);
  }, [initialRotationX, initialRotationY, zoom]);

  useEffect(() => {
    if (rootRef.current) {
      // Aplicamos el valor Z de la UI al eje Y del modelo
      rootRef.current.rotation.y = initialRotationZ * DEG;
    }
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
        autoRotate={autoRotate}
        autoRotateSpeed={rotationSpeed}
        onEnd={() => {
          const orbit = orbitRef.current;
          if (!orbit || !onRotationChange) return;
          const ry = orbit.getAzimuthalAngle() * (180 / Math.PI);
          const rx = (Math.PI / 2 - orbit.getPolarAngle()) * (180 / Math.PI);
          onRotationChange(rx, ry);
        }}
      />
      <Environment preset={environment as EnvironmentPreset} environmentIntensity={glow} background={false} />

      <ambientLight intensity={0.3} />
      <directionalLight position={[3, 6, 5]} intensity={0.6} />
      <directionalLight position={[-4, -2, 3]} intensity={0.25} color="#c8d8ff" />
      <directionalLight position={[0, -5, 5]} intensity={0.35} />

      <group ref={rootRef} rotation={[0, initialRotationZ * DEG, 0]}>
        {modelGroup && <primitive object={modelGroup} />}
      </group>
    </>
  );
}

function CanvasWithLoader(
  props: Props & {
    rootRef: React.MutableRefObject<THREE.Group | null>;
    cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  }
) {
  const [loaded, setLoaded] = useState(false);
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
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
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
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 4 }}
        >
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
    </>
  );
}

export function DoubleIPhone3DViewer(props: Props) {
  const { scale = 1, shadowIntensity = 0, shadowColor = "#000000" } = props;

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
    <>
      <ControlsPopup />
      <div
        style={{
          display: "inline-block",
          transformOrigin: "top center",
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
              inset: "-400px",
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
    </>
  );
}