"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, useGLTF, Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import { useEffect, useRef, useState, Suspense, useLayoutEffect } from "react";
import * as THREE from "three";
import { createCoverScreenCanvas, applyCropToImage, parseShadowColor, type ImageMaskConfigLike } from "@/lib/phone3d.utils";
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { EnvironmentPreset, HDRI_FILES } from "@/lib/viewer-controls3d";

export interface IPhone13ProMax3DApi {
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
  onApi?: (api: IPhone13ProMax3DApi | null) => void;
  scale?: number;
  zoom?: number;
  shadowIntensity?: number;
  shadowColor?: string;
  videoElement?: HTMLVideoElement | null;
  autoRotate?: boolean;
  rotationSpeed?: number;
  glow?: number;
  environment?: EnvironmentPreset;
}

const TEX_W = 1284 * 2;
const TEX_H = 2778 * 2;
const PLACEHOLDER_PHONE_URL = "/images/mockups-3d/placeholder-phone.avif";
const DEFAULT_CAMERA_POS: [number, number, number] = [0, 0, 1.5];
const DRACO_URL = "https://www.gstatic.com/draco/versioned/decoders/1.5.6/";

useGLTF.preload("/models/apple_iphone_13_pro_max.glb", DRACO_URL);

interface GLTFNodes {
  Frame_Frame_0: THREE.Mesh;
  Frame_Frame2_0: THREE.Mesh;
  Frame_Port_0: THREE.Mesh;
  Frame_Antenna_0: THREE.Mesh;
  Frame_Mic_0: THREE.Mesh;
  Body_Mic_0: THREE.Mesh;
  Body_Bezel_0: THREE.Mesh;
  Body_Body_0: THREE.Mesh;
  Body_Wallpaper_0: THREE.Mesh;
  Body_Camera_Glass_0: THREE.Mesh;
  Body_Lens_0: THREE.Mesh;
  Body_Material_0: THREE.Mesh;
  Camera_Body_0: THREE.Mesh;
  Camera_Glass_0: THREE.Mesh;
  Camera_Camera_Frame001_0: THREE.Mesh;
  Camera_Mic_0: THREE.Mesh;
  Body001_Screen_Glass_0: THREE.Mesh;
  Button_Frame_0: THREE.Mesh;
  Circle003_Frame_0: THREE.Mesh;
  Apple_Logo_Logo_0: THREE.Mesh;
  Camera001_Body_0: THREE.Mesh;
  Camera001_Gray_Glass_0: THREE.Mesh;
  Camera001_Flash_0: THREE.Mesh;
  Camera001_Port_0: THREE.Mesh;
  Camera001_Camera_Frame_0: THREE.Mesh;
  Camera001_Camera_Glass_0: THREE.Mesh;
  Camera001_Lens_0: THREE.Mesh;
  Camera001_Black_Glass_0: THREE.Mesh;
  Camera003_Material002_0: THREE.Mesh;
}

interface GLTFMaterials {
  Frame: THREE.Material;
  Frame2: THREE.Material;
  Port: THREE.Material;
  Antenna: THREE.Material;
  material: THREE.Material;
  Bezel: THREE.Material;
  Body: THREE.Material;
  Wallpaper: THREE.Material;
  Camera_Glass: THREE.Material;
  Lens: THREE.Material;
  Material: THREE.Material;
  Glass: THREE.Material;
  "Camera_Frame.001": THREE.Material;
  Screen_Glass: THREE.Material;
  Logo: THREE.Material;
  Gray_Glass: THREE.Material;
  Flash: THREE.Material;
  Camera_Frame: THREE.Material;
  Black_Glass: THREE.Material;
  "Material.002": THREE.Material;
}

function ModelScene({
  imageUrl,
  imageMaskConfig,
  cropArea,
  initialRotationX,
  initialRotationY,
  initialRotationZ,
  onRotationChange,
  rootRef,
  cameraRef,
  zoom,
  onApi,
  onLoaded,
  videoElement,
  shadowIntensity = 0,
  shadowColor = "#000000",
  autoRotate = false,
  rotationSpeed = 3.5,
  glow = 2.0,
  environment = "sunset",
}: {
  imageUrl: string | null;
  imageMaskConfig: ImageMaskConfigLike | null;
  cropArea: { x: number; y: number; width: number; height: number } | null;
  initialRotationX: number;
  initialRotationY: number;
  initialRotationZ: number;
  onRotationChange?: (rx: number, ry: number) => void;
  rootRef: React.MutableRefObject<THREE.Group | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  zoom: number;
  onApi?: (api: IPhone13ProMax3DApi | null) => void;
  onLoaded?: () => void;
  videoElement?: HTMLVideoElement | null;
  shadowIntensity?: number;
  shadowColor?: string;
  autoRotate?: boolean;
  rotationSpeed?: number;
  glow?: number;
  environment?: EnvironmentPreset;
}) {
  const { gl, scene, camera, invalidate } = useThree();
  const gltf = useGLTF("/models/apple_iphone_13_pro_max.glb", DRACO_URL) as unknown as {
    nodes: GLTFNodes;
    materials: GLTFMaterials;
  };
  const { nodes, materials } = gltf;

  const orbitRef = useRef<OrbitControlsType | null>(null);
  const lastLoadedImageUrlRef = useRef<string | null>(null);
  const lastLoadedMaskKeyRef = useRef<string | null>(null);
  const lastLoadedCropKeyRef = useRef<string | null>(null);
  const wallpaperMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const onApiRef = useRef(onApi);

  useLayoutEffect(() => {
    onApiRef.current = onApi;
  });

  useFrame(() => {
    if (videoElement && videoTextureRef.current) {
      videoTextureRef.current.needsUpdate = true;
    }
  });

  useEffect(() => {
    const capturedOnApi = onApiRef.current;
    const RENDER_PIXEL_RATIO = 2;

    const api: IPhone13ProMax3DApi = {
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

        gl.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
        gl.setSize(freshW, freshH, false);
      },
      hasBuiltInShadow: true,
    };

    capturedOnApi?.(api);
    return () => capturedOnApi?.(null);
  }, [gl, scene, camera, cameraRef]);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded]);

  useEffect(() => {
    if (materials.Wallpaper) {
      wallpaperMatRef.current = materials.Wallpaper as THREE.MeshStandardMaterial;
    }
  }, [materials.Wallpaper]);

  useEffect(() => {
    if (!videoElement) {
      if (videoTextureRef.current) {
        videoTextureRef.current.dispose();
        videoTextureRef.current = null;
      }
      return;
    }

    const tex = new THREE.VideoTexture(videoElement);
    tex.flipY = true;
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

    const applyVideoTex = () => {
      const mat = wallpaperMatRef.current;
      if (!mat) return;
      if (mat.map && mat.map !== tex) {
        mat.map.dispose();
      }
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    };

    applyVideoTex();

    return () => {
      if (videoTextureRef.current === tex) {
        videoTextureRef.current = null;
      }
      tex.dispose();
    };
  }, [videoElement]);

  useEffect(() => {
    const mat = wallpaperMatRef.current;
    if (!mat) return;
    if (videoElement) return;

    const maskKey = imageMaskConfig ? JSON.stringify(imageMaskConfig) : null;
    const cropKey = cropArea ? JSON.stringify(cropArea) : null;

    if (!imageUrl) {
      const placeholderKey = `__placeholder__:${PLACEHOLDER_PHONE_URL}`;
      if (lastLoadedImageUrlRef.current === placeholderKey) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const cover = createCoverScreenCanvas(img, TEX_W, TEX_H, 0, null);
        if (mat.map) {
          mat.map.dispose();
          mat.map = null;
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
        mat.map = tex;
        mat.needsUpdate = true;
        lastLoadedImageUrlRef.current = placeholderKey;
        lastLoadedMaskKeyRef.current = null;
        lastLoadedCropKeyRef.current = null;
      };
      img.onerror = () => {
        if (mat.map) {
          mat.map.dispose();
          mat.map = null;
        }
        mat.color.set(0x1a1a1a);
        mat.needsUpdate = true;
        lastLoadedImageUrlRef.current = placeholderKey;
      };
      img.src = PLACEHOLDER_PHONE_URL;
      return;
    }

    if (
      lastLoadedImageUrlRef.current === imageUrl &&
      lastLoadedMaskKeyRef.current === maskKey &&
      lastLoadedCropKeyRef.current === cropKey
    )
      return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const sourceImage = cropArea ? applyCropToImage(img, cropArea) : img;
      const cover = createCoverScreenCanvas(sourceImage, TEX_W, TEX_H, 0, imageMaskConfig);
      if (mat.map) {
        mat.map.dispose();
        mat.map = null;
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
      mat.map = tex;
      mat.needsUpdate = true;
      invalidate();
      lastLoadedImageUrlRef.current = imageUrl;
      lastLoadedMaskKeyRef.current = maskKey;
      lastLoadedCropKeyRef.current = cropKey;
    };
    img.src = imageUrl;
  }, [imageUrl, imageMaskConfig, cropArea, gl, videoElement]);

  useEffect(() => {
    return () => {
      if (wallpaperMatRef.current && wallpaperMatRef.current.map) {
        wallpaperMatRef.current.map.dispose();
      }
    };
  }, []);

  const prevRotationRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (
      prevRotationRef.current?.x === initialRotationX &&
      prevRotationRef.current?.y === initialRotationY
    )
      return;

    const id = setTimeout(() => {
      const orbit = orbitRef.current;
      if (!orbit) return;

      const DEG = Math.PI / 180;
      const radius = 1.5;
      const phi = Math.PI / 2 - initialRotationX * DEG;
      const theta = initialRotationY * DEG;

      orbit.object.position.setFromSphericalCoords(radius, phi, theta);
      orbit.update();
      invalidate();
      prevRotationRef.current = { x: initialRotationX, y: initialRotationY };
    }, 0);

    return () => clearTimeout(id);
  }, [initialRotationX, initialRotationY, zoom]);

  useEffect(() => {
    const root = rootRef.current;
    if (root) {
      root.rotation.z = initialRotationZ * (Math.PI / 180);
      invalidate();
    }
  }, [initialRotationZ, invalidate]);

  const shadowT = Math.max(0, Math.min(1, shadowIntensity));
  const showContactShadow = shadowT > 0.01;
  const contactOpacity = shadowT * 0.45;
  // Sombra proyectada — más larga, con dirección, más sutil
  const castOpacity = shadowT * 0.55;
  const contactBlur = 1.5 + shadowT * 1.5;

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={40}
        near={0.01}
        far={100}
        position={DEFAULT_CAMERA_POS}
        zoom={zoom}
      />
      <Environment files={HDRI_FILES[environment as EnvironmentPreset]} environmentIntensity={glow} background={false} />
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
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[3, 6, 5]}
        intensity={0.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={10}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={1.5}
        shadow-camera-bottom={-1.5}
        shadow-bias={-0.0015}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-4, -2, 3]} intensity={0.25} color="#c8d8ff" />
      <directionalLight position={[0, -5, 5]} intensity={0.35} />
      {showContactShadow && (
        <>
          {/* Capa 1: sombra proyectada real, con dirección, del shadow map */}
          <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[10, 10]} />
            <shadowMaterial transparent opacity={castOpacity} color={shadowColor} />
          </mesh>
          {/* Capa 2: AO de contacto, corta y muy oscura, justo bajo el modelo.
              Offset de +1mm en Y respecto al plano de arriba para evitar z-fighting
              entre ambos planos coplanares. */}
          <ContactShadows
            position={[0, -0.549, 0]}
            opacity={contactOpacity}
            scale={3}
            blur={contactBlur}
            far={4}
            color={shadowColor}
            resolution={512}
          />
        </>
      )}
      <group ref={rootRef} rotation={[0, Math.PI, 0]} scale={0.007} dispose={null}>
        <group scale={100}>
          <mesh castShadow receiveShadow geometry={nodes.Frame_Frame_0.geometry} material={materials.Frame} />
          <mesh castShadow receiveShadow geometry={nodes.Frame_Frame2_0.geometry} material={materials.Frame2} />
          <mesh castShadow receiveShadow geometry={nodes.Frame_Port_0.geometry} material={materials.Port} />
          <mesh castShadow receiveShadow geometry={nodes.Frame_Antenna_0.geometry} material={materials.Antenna} />
          <mesh castShadow receiveShadow geometry={nodes.Frame_Mic_0.geometry} material={materials.material} />
          <mesh castShadow receiveShadow geometry={nodes.Body_Mic_0.geometry} material={materials.material} />
          <mesh castShadow receiveShadow geometry={nodes.Body_Bezel_0.geometry} material={materials.Bezel} />
          <mesh castShadow receiveShadow geometry={nodes.Body_Body_0.geometry} material={materials.Body} />
          <mesh castShadow receiveShadow geometry={nodes.Body_Wallpaper_0.geometry} material={materials.Wallpaper} />
          <mesh castShadow receiveShadow geometry={nodes.Body_Camera_Glass_0.geometry} material={materials.Camera_Glass} />
          <mesh castShadow receiveShadow geometry={nodes.Body_Lens_0.geometry} material={materials.Lens} />
          <mesh castShadow receiveShadow geometry={nodes.Body_Material_0.geometry} material={materials.Material} />
          <mesh castShadow receiveShadow geometry={nodes.Camera_Body_0.geometry} material={materials.Body} />
          <mesh castShadow receiveShadow geometry={nodes.Camera_Glass_0.geometry} material={materials.Glass} />
          <mesh castShadow receiveShadow geometry={nodes.Camera_Camera_Frame001_0.geometry} material={materials["Camera_Frame.001"]} />
          <mesh castShadow receiveShadow geometry={nodes.Camera_Mic_0.geometry} material={materials.material} />
          <mesh castShadow receiveShadow geometry={nodes.Body001_Screen_Glass_0.geometry} material={materials.Screen_Glass} />
          <mesh castShadow receiveShadow geometry={nodes.Button_Frame_0.geometry} material={materials.Frame} />
          <mesh castShadow receiveShadow geometry={nodes.Circle003_Frame_0.geometry} material={materials.Frame} />
          <mesh castShadow receiveShadow geometry={nodes.Apple_Logo_Logo_0.geometry} material={materials.Logo} />
          <mesh castShadow receiveShadow geometry={nodes.Camera001_Body_0.geometry} material={materials.Body} />
          <mesh castShadow receiveShadow geometry={nodes.Camera001_Gray_Glass_0.geometry} material={materials.Gray_Glass} />
          <mesh castShadow receiveShadow geometry={nodes.Camera001_Flash_0.geometry} material={materials.Flash} />
          <mesh castShadow receiveShadow geometry={nodes.Camera001_Port_0.geometry} material={materials.Port} />
          <mesh castShadow receiveShadow geometry={nodes.Camera001_Camera_Frame_0.geometry} material={materials.Camera_Frame} />
          <mesh castShadow receiveShadow geometry={nodes.Camera001_Camera_Glass_0.geometry} material={materials.Camera_Glass} />
          <mesh castShadow receiveShadow geometry={nodes.Camera001_Lens_0.geometry} material={materials.Lens} />
          <mesh castShadow receiveShadow geometry={nodes.Camera001_Black_Glass_0.geometry} material={materials.Black_Glass} />
          <mesh castShadow receiveShadow geometry={nodes.Camera003_Material002_0.geometry} material={materials["Material.002"]} />
        </group>
      </group>
    </>
  );
}

function CanvasWithLoader({
  imageUrl,
  imageMaskConfig,
  cropArea,
  initialRotationX,
  initialRotationY,
  initialRotationZ,
  onRotationChange,
  rootRef,
  cameraRef,
  zoom,
  onApi,
  onMount,
  videoElement,
  shadowIntensity,
  shadowColor,
  autoRotate,
  rotationSpeed,
  glow,
  environment,
}: {
  imageUrl: string | null;
  imageMaskConfig: ImageMaskConfigLike | null;
  cropArea: { x: number; y: number; width: number; height: number } | null;
  initialRotationX: number;
  initialRotationY: number;
  initialRotationZ: number;
  onRotationChange?: (rx: number, ry: number) => void;
  rootRef: React.MutableRefObject<THREE.Group | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
  zoom: number;
  onApi?: (api: IPhone13ProMax3DApi | null) => void;
  onMount?: (canvas: HTMLCanvasElement) => void;
  videoElement?: HTMLVideoElement | null;
  shadowIntensity?: number;
  shadowColor?: string;
  autoRotate?: boolean;
  rotationSpeed?: number;
  glow?: number;
  environment?: EnvironmentPreset;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <Canvas
        shadows="soft"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
        }}
        dpr={3}
        frameloop={videoElement ? "always" : "demand"}
        resize={{ scroll: false, debounce: { scroll: 0, resize: 0 } }}
        onCreated={({ gl, scene }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
          scene.environmentIntensity = 1.6;
          onMount?.(gl.domElement);
        }}
      >
        <Suspense fallback={null}>
          <ModelScene
            imageUrl={imageUrl}
            imageMaskConfig={imageMaskConfig}
            cropArea={cropArea}
            initialRotationX={initialRotationX}
            initialRotationY={initialRotationY}
            initialRotationZ={initialRotationZ}
            onRotationChange={onRotationChange}
            rootRef={rootRef}
            cameraRef={cameraRef}
            zoom={zoom}
            onApi={onApi}
            onLoaded={() => setLoaded(true)}
            videoElement={videoElement}
            shadowIntensity={shadowIntensity}
            shadowColor={shadowColor}
            autoRotate={autoRotate}
            rotationSpeed={rotationSpeed}
            glow={glow}
            environment={environment}
          />
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

export function IPhone13ProMax3DViewer({
  imageUrl = null,
  imageMaskConfig = null,
  cropArea = null,
  initialRotationX = -58.23,
  initialRotationY = -29.82,
  initialRotationZ = 0,
  onRotationChange,
  onMount,
  onApi,
  zoom = 1,
  shadowIntensity = 0,
  shadowColor = "#000000",
  videoElement = null,
  autoRotate,
  rotationSpeed,
  glow,
  environment
}: Props) {
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
      <div
        style={{
          display: "inline-block",
          transformOrigin: "top center",
          width: 480,
          height: 1000 + (hasShadow ? computedBlur * 0.8 : 0),
          marginTop: "200px",
          marginLeft: "170px",
        }}
      >
        <div style={{ position: "relative", width: 480, height: 1000 }}>
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
            <CanvasWithLoader
              imageUrl={imageUrl}
              imageMaskConfig={imageMaskConfig}
              cropArea={cropArea}
              initialRotationX={initialRotationX}
              initialRotationY={initialRotationY}
              initialRotationZ={initialRotationZ}
              onRotationChange={onRotationChange}
              rootRef={rootRef}
              cameraRef={cameraRef}
              zoom={zoom}
              onApi={onApi}
              onMount={onMount}
              videoElement={videoElement}
              shadowIntensity={shadowIntensity}
              shadowColor={shadowColor}
              autoRotate={autoRotate}
              rotationSpeed={rotationSpeed}
              glow={glow}
              environment={environment}
            />
          </div>
        </div>
      </div>
    </>
  );
}