"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Environment, OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState, Suspense, useCallback, useLayoutEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  createCoverScreenCanvas,
  applyCropToImage,
  parseShadowColor,
  type ImageMaskConfigLike,
} from "@/lib/phone3d.utils";
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { ControlsPopup } from "@/components/ui/ControlsPopup";
import { EnvironmentPreset, ViewerControls3D } from "@/lib/viewer-controls3d";

THREE.Cache.enabled = true;

const LAPTOP_W = 1500;
const LAPTOP_H = 1035;
const RENDER_MULTIPLIER = 3;
const RENDER_W = LAPTOP_W * RENDER_MULTIPLIER;
const RENDER_H = LAPTOP_H * RENDER_MULTIPLIER;
const CAM_FOV = 40;
const CAM_RADIUS = 75;
const screenSize: [number, number] = [29.4, 20];
const LID_CLOSED_X = Math.PI * 0.5;
const LID_OPEN_X = -0.2 * Math.PI;
const DEG = Math.PI / 180;
const PLACEHOLDER_LAPTOP_URL = "/images/mockups-3d/placeholder-laptop.avif";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface Laptop3DApi {
  renderAt: (width: number, height: number) => void;
  restorePreview: () => void;
  hasBuiltInShadow: boolean;
}

interface Props {
  imageUrl?: string | null;
  imageMaskConfig?: ImageMaskConfigLike | null;
  cropArea?: { x: number; y: number; width: number; height: number } | null;
  openingProgress?: number;
  initialRotationX?: number;
  initialRotationY?: number;
  initialRotationZ?: number;
  onRotationChange?: (rx: number, ry: number) => void;
  onMount?: (canvas: HTMLCanvasElement) => void;
  onApi?: (api: Laptop3DApi | null) => void;
  scale?: number;
  zoom?: number;
  shadowIntensity?: number;
  shadowColor?: string;
  videoElement?: HTMLVideoElement | null;
}

let gltfCachePromise: Promise<THREE.Group> | null = null;

function loadLaptopGltf(): Promise<THREE.Group> {
  if (!gltfCachePromise) {
    gltfCachePromise = new Promise<THREE.Group>((resolve, reject) =>
      new GLTFLoader().load(
        "/models/mac-book.glb",
        (gltf) => resolve(gltf.scene as THREE.Group),
        undefined,
        reject
      )
    );
  }
  return gltfCachePromise;
}

function ModelScene({
  imageUrl,
  imageMaskConfig,
  cropArea,
  openingProgress = 1,
  initialRotationX = 43.23,
  initialRotationY = -37.82,
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
  const { gl, scene, camera, invalidate } = useThree();
  const orbitRef = useRef<OrbitControlsType | null>(null);
  const [modelGroup, setModelGroup] = useState<THREE.Group | null>(null);
  const lidGroupRef = useRef<THREE.Group | null>(null);
  const screenMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const lastLoadedUrlRef = useRef<string | null>(null);
  const lastLoadedCropKeyRef = useRef<string | null>(null);
  const onApiRef = useRef(onApi);

  useLayoutEffect(() => {
    onApiRef.current = onApi;
  });

  const { autoRotate, rotationSpeed, glow, environment } = ViewerControls3D({
    defaultEnvironment: "forest",
  });

  useFrame(() => {
    if (videoElement && videoTextureRef.current) {
      videoTextureRef.current.needsUpdate = true;
    }
  });

  useEffect(() => {
    const capturedOnApi = onApiRef.current;
    const api: Laptop3DApi = {
      renderAt: (w, h) => {
        const cam = cameraRef.current ?? camera;
        if (!cam) return;

        const RENDER_PIXEL_RATIO = 2;
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

        gl.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
        gl.setSize(freshW, freshH, false);
        invalidate();
      },
      hasBuiltInShadow: true,
    };

    capturedOnApi?.(api);
    return () => capturedOnApi?.(null);
  }, [gl, scene, camera, cameraRef, invalidate]);

  const applyTexture = useCallback(() => {
    if (videoElement) return;

    const mat = screenMatRef.current;
    if (!mat) return;

    const cropKey = cropArea ? JSON.stringify(cropArea) : null;

    if (!imageUrl) {
      const placeholderKey = `__placeholder__:${PLACEHOLDER_LAPTOP_URL}`;
      if (lastLoadedUrlRef.current === placeholderKey) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const currentMat = screenMatRef.current;
        if (!currentMat) return;

        const TEX_W = RENDER_W;
        const TEX_H = RENDER_H;
        const cover = createCoverScreenCanvas(img, TEX_W, TEX_H, 0, null);

        if (currentMat.map) {
          currentMat.map.dispose();
        }

        const tex = new THREE.CanvasTexture(cover);
        tex.flipY = false;
        tex.wrapS = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;

        if (cover.width && cover.height) {
          tex.repeat.y = (cover.width / cover.height / screenSize[0]) * screenSize[1];
        }

        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = gl.capabilities.getMaxAnisotropy();

        currentMat.map = tex;
        currentMat.color.set(0xffffff);
        currentMat.needsUpdate = true;

        lastLoadedUrlRef.current = placeholderKey;
        lastLoadedCropKeyRef.current = null;
        invalidate();
      };
      img.onerror = () => {
        lastLoadedUrlRef.current = placeholderKey;
      };
      img.src = PLACEHOLDER_LAPTOP_URL;
      return;
    }

    if (
      lastLoadedUrlRef.current === imageUrl &&
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

      const TEX_W = RENDER_W;
      const TEX_H = RENDER_H;
      const cropped = applyCropToImage(img, cropArea);
      const cover = createCoverScreenCanvas(cropped, TEX_W, TEX_H, 0, imageMaskConfig);

      if (currentMat.map) {
        currentMat.map.dispose();
      }

      const tex = new THREE.CanvasTexture(cover);
      tex.flipY = false;
      tex.wrapS = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;

      if (cover.width && cover.height) {
        tex.repeat.y = (cover.width / cover.height / screenSize[0]) * screenSize[1];
      }

      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();

      currentMat.map = tex;
      currentMat.color.set(0xffffff);
      currentMat.needsUpdate = true;

      lastLoadedUrlRef.current = imageUrl;
      lastLoadedCropKeyRef.current = cropKey;
      invalidate();
    };
    img.onerror = () => {
      lastLoadedUrlRef.current = imageUrl;
      lastLoadedCropKeyRef.current = cropKey;
    };
    img.src = imageUrl;
  }, [imageUrl, imageMaskConfig, cropArea, gl, videoElement, invalidate]);

  const applyVideoTextureIfReady = useCallback(() => {
    const mat = screenMatRef.current;
    const tex = videoTextureRef.current;
    if (mat && tex) {
      if (mat.map && mat.map !== tex) {
        mat.map.dispose();
      }
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
      invalidate();
    }
  }, [invalidate]);

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

    const darkPlasticMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9, metalness: 0.9 });
    const cameraMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const logoMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const baseMetalMaterial = new THREE.MeshStandardMaterial({ color: 0xcecfd3, roughness: 0.25, metalness: 0.85 });

    const tStart = Math.max(0, Math.min(1, openingProgress));
    const screenMaterial = new THREE.MeshBasicMaterial({
      map: null,
      transparent: true,
      opacity: 0.96 * tStart,
      side: THREE.BackSide,
      color: 0xffffff,
      toneMapped: false,
    });
    screenMatRef.current = screenMaterial;
    applyVideoTextureIfReady();

    const textLoader = new THREE.TextureLoader();
    const keyboardMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false });
    
    textLoader.load("/images/pages/keyboard-overlay.png", (tex) => {
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();
      keyboardMaterial.alphaMap = tex;
      keyboardMaterial.needsUpdate = true;
      invalidate();
    });

    const finalizeSetup = (group: THREE.Group) => {
      if (!isMounted) return;
      setModelGroup(group);
      setTimeout(() => {
        if (!isMounted) return;
        applyTextureRef.current();
        onLoaded?.();
        invalidate();
      }, 50);
    };

    loadLaptopGltf()
      .then((cachedGltf) => {
        const root = cachedGltf.clone(true);
        root.position.z = -10;

        const lidGroup = new THREE.Group();
        const bottomGroup = new THREE.Group();

        [...root.children].forEach((child) => {
          if (child.name === "_top") {
            lidGroup.add(child);
            [...child.children].forEach((obj) => {
              if (!(obj instanceof THREE.Mesh)) return;
              const m = obj as THREE.Mesh;
              if (m.name === "lid") m.material = baseMetalMaterial;
              else if (m.name === "logo") m.material = logoMaterial;
              else if (m.name === "screen-frame") m.material = darkPlasticMaterial;
              else if (m.name === "camera") m.material = cameraMaterial;
            });
          } else if (child.name === "_bottom") {
            bottomGroup.add(child);
            [...child.children].forEach((obj) => {
              if (!(obj instanceof THREE.Mesh)) return;
              const m = obj as THREE.Mesh;
              if (m.name === "base") m.material = baseMetalMaterial;
              else if (["legs", "keyboard", "inner"].includes(m.name)) m.material = darkPlasticMaterial;
            });
          }
        });

        root.add(lidGroup);
        root.add(bottomGroup);
        lidGroupRef.current = lidGroup;

        const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(screenSize[0], screenSize[1]), screenMaterial);
        screenMesh.position.set(0, 10.5, -0.11);
        screenMesh.rotation.set(Math.PI, 0, 0);
        lidGroup.add(screenMesh);

        const darkScreen = new THREE.Mesh(new THREE.PlaneGeometry(screenSize[0], screenSize[1]), darkPlasticMaterial);
        darkScreen.position.set(0, 10.5, -0.111);
        darkScreen.rotation.set(Math.PI, Math.PI, 0);
        lidGroup.add(darkScreen);

        const keyboardKeys = new THREE.Mesh(new THREE.PlaneGeometry(27.7, 11.6), keyboardMaterial);
        keyboardKeys.rotation.set(-0.5 * Math.PI, 0, 0);
        keyboardKeys.position.set(0, 0.045, 7.21);
        bottomGroup.add(keyboardKeys);

        finalizeSetup(root);
      })
      .catch((err) => {
        console.error("Error al cargar el GLB del laptop:", err);
      });

    return () => {
      isMounted = false;
      darkPlasticMaterial.dispose();
      cameraMaterial.dispose();
      logoMaterial.dispose();
      baseMetalMaterial.dispose();
      keyboardMaterial.dispose();
      if (screenMatRef.current) {
        screenMatRef.current.dispose();
      }
    };
  }, [openingProgress, applyVideoTextureIfReady, onLoaded, gl, invalidate]);

  const prevRotationRef = useRef({ x: initialRotationX, y: initialRotationY });

  useEffect(() => {
    if (prevRotationRef.current.x === initialRotationX && prevRotationRef.current.y === initialRotationY) return;
    const orbit = orbitRef.current;
    if (!orbit) return;

    const radius = CAM_RADIUS / zoom;
    const phi = Math.PI / 2 - initialRotationX * DEG;
    const theta = initialRotationY * DEG;

    orbit.object.position.setFromSphericalCoords(radius, phi, theta);
    orbit.update();
    invalidate();

    prevRotationRef.current = { x: initialRotationX, y: initialRotationY };
  }, [initialRotationX, initialRotationY, zoom, invalidate]);

  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.rotation.z = initialRotationZ * DEG;
      invalidate();
    }
  }, [initialRotationZ, modelGroup, invalidate]);

  useEffect(() => {
    const lid = lidGroupRef.current;
    const mat = screenMatRef.current;
    if (!lid || !mat) return;
    const t = Math.max(0, Math.min(1, openingProgress));
    lid.rotation.x = lerp(LID_CLOSED_X, LID_OPEN_X, t);
    mat.opacity = 0.96 * t;
    invalidate();
  }, [openingProgress, modelGroup, invalidate]);

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault fov={CAM_FOV} near={10} far={1000} position={[0, 0, CAM_RADIUS / zoom]} />
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
      <ambientLight intensity={3.2} />
      <group>
        <pointLight position={[0, 5, 50]} intensity={0.8} color="#fff5e1" />
      </group>
      <directionalLight position={[4, 8, 7]} intensity={2.6} />
      <directionalLight position={[-5, -2, 4]} intensity={0.8} color="#aabbff" />
      <directionalLight position={[0, -6, 6]} intensity={1.3} />
      <group ref={rootRef} rotation={[0, 0, initialRotationZ * DEG]}>
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
        }}
        dpr={3}
        frameloop={props.videoElement ? "always" : "demand"}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.5;
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

export function Laptop3DViewer(props: Props) {
  const { shadowIntensity = 0, shadowColor = "#000000" } = props;
  const rootRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  const t = Math.max(0, Math.min(1, shadowIntensity));
  const tEased = t * t;
  const computedBlur = tEased * 60;
  const computedOpacity = tEased * 0.7;
  const shadowRgba = shadowColor.startsWith("#") ? parseShadowColor(shadowColor, computedOpacity) : shadowColor;
  const hasShadow = t > 0.01;

  return (
    <>
      <ControlsPopup />
      <div
        style={{
          display: "inline-block",
          transformOrigin: "top center",
          width: LAPTOP_W,
          height: LAPTOP_H + (hasShadow ? computedBlur * 0.8 : 0),
          marginTop: "250px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: LAPTOP_W,
            height: LAPTOP_H,
            overflow: "visible",
            willChange: "transform",
          }}
        >
          {hasShadow && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                bottom: -(computedBlur * 0.5),
                left: `${10 + tEased * 5}%`,
                width: `${80 - tEased * 10}%`,
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
              left: 0,
              top: 0,
              width: LAPTOP_W,
              height: LAPTOP_H,
              overflow: "visible",
              zIndex: 2,
              cursor: grabbing ? "grabbing" : "grab",
              filter: hasShadow
                ? `drop-shadow(0px ${(tEased * 22).toFixed(1)}px ${(tEased * 32).toFixed(1)}px ${shadowRgba})`
                : "none",
              transition: "filter 0.15s ease",
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