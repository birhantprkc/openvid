"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, useGLTF, Environment, OrbitControls } from "@react-three/drei";
import { useEffect, useRef, useState, Suspense } from "react";
import * as THREE from "three";
import {
    createCoverScreenCanvas,
    applyCropToImage,
    parseShadowColor,
    type ImageMaskConfigLike,
} from "@/lib/phone3d.utils";
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

import { ControlsPopup } from "@/components/ui/ControlsPopup";
import { EnvironmentPreset, ViewerControls3D } from "@/lib/viewer-controls3d";

export interface IPhone13ProMax3DApi {
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
    onApi?: (api: IPhone13ProMax3DApi | null) => void;
    scale?: number;
    zoom?: number;
    shadowIntensity?: number;
    shadowColor?: string;
    videoElement?: HTMLVideoElement | null;
}

const TEX_W = 1284 * 2;
const TEX_H = 2778 * 2;

useGLTF.preload("/models/apple_iphone_13_pro_max.glb");

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
}) {
    const { gl } = useThree();
    const gltf = useGLTF("/models/apple_iphone_13_pro_max.glb") as unknown as {
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

    const { autoRotate, rotationSpeed, glow, environment } = ViewerControls3D();

    useFrame(() => {
        if (videoElement && videoTextureRef.current) {
            videoTextureRef.current.needsUpdate = true;
        }
    });

    useEffect(() => {
        const api: IPhone13ProMax3DApi = {
            renderAt: (w, h) => {
                void w;
                void h;
            },
        };
        onApi?.(api);
        return () => onApi?.(null);
    }, [onApi]);

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
            if (mat.map) {
                mat.map.dispose();
                mat.map = null;
                mat.needsUpdate = true;
            }
            lastLoadedImageUrlRef.current = null;
            lastLoadedMaskKeyRef.current = null;
            lastLoadedCropKeyRef.current = null;
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

            lastLoadedImageUrlRef.current = imageUrl;
            lastLoadedMaskKeyRef.current = maskKey;
            lastLoadedCropKeyRef.current = cropKey;
        };
        img.src = imageUrl;
    }, [imageUrl, imageMaskConfig, cropArea, gl, videoElement]);

    // Track previous rotation values to avoid resetting the camera when
    // the same values are passed back from OrbitControls onEnd callback.
    // Only reset when the parent intentionally changes the rotation (e.g. preset click).
    const prevRotationRef = useRef({ x: initialRotationX, y: initialRotationY });

    useEffect(() => {
        // Skip if the rotation didn't actually change (e.g. OrbitControls
        // reported the same values back, or a parent re-render passed same props).
        if (prevRotationRef.current.x === initialRotationX && prevRotationRef.current.y === initialRotationY) return;
        const id = setTimeout(() => {
            const orbit = orbitRef.current;
            if (!orbit) return;
            const DEG = Math.PI / 180;
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
        const root = rootRef.current;
        if (root) {
            root.rotation.z = initialRotationZ * (Math.PI / 180);
        }
    }, [initialRotationZ]);

    return (
        <>
            <PerspectiveCamera ref={cameraRef} makeDefault fov={40} near={0.01} far={100} position={[0, 0, 1.5 / zoom]} />

            <Environment
                preset={environment as EnvironmentPreset}
                environmentIntensity={glow}
            />

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
            <directionalLight position={[3, 6, 5]} intensity={0.6} />
            <directionalLight position={[-4, -2, 3]} intensity={0.25} color="#c8d8ff" />
            <directionalLight position={[0, -5, 5]} intensity={0.35} />

            <group ref={rootRef} rotation={[0, Math.PI, 0]} scale={0.01} dispose={null}>
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
}) {
    const [loaded, setLoaded] = useState(false);
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
    scale = 1,
    zoom = 1,
    shadowIntensity = 0,
    shadowColor = "#000000",
    videoElement = null,
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
            {/* 3. Renderizamos el panel extraído exactamente igual que en el otro componente */}
            <ControlsPopup />

            <div
                style={{
                    display: "inline-block",
                    transformOrigin: "top center",
                    width: 480,
                    height: 1000 + (hasShadow ? computedBlur * 0.8 : 0),
                    marginTop: "200px",
                    marginLeft: "170px"
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
                        />
                    </div>
                </div>
            </div>
        </>
    );
}