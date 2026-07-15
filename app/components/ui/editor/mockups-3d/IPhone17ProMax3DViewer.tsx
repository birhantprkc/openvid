"use client";

import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, useGLTF, Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import { useEffect, useRef, useState, Suspense, useLayoutEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import {
    createCoverScreenCanvas,
    applyCropToImage,
    parseShadowColor,
    type ImageMaskConfigLike,
    applyTextureCover
} from "@/lib/phone3d.utils";
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { EnvironmentPreset, HDRI_FILES } from "@/lib/viewer-controls3d";
import { GetMediaMaskStyles } from "@/lib/media-mask.utils";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface IPhone17ProMax3DApi {
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
    onApi?: (api: IPhone17ProMax3DApi | null) => void;
    scale?: number;
    zoom?: number;
    shadowIntensity?: number;
    shadowColor?: string;
    videoElement?: HTMLVideoElement | null;
    autoRotate?: boolean;
    rotationSpeed?: number;
    glow?: number;
    environment?: EnvironmentPreset;
    isSelected?: boolean;
    isHovered?: boolean;
    onHoverChange?: (isHovered: boolean) => void;
    onSelectChange?: (isSelected: boolean) => void;
}

const TEX_W = 1284 * 2;
const TEX_H = 2778 * 2;
const PLACEHOLDER_PHONE_URL = "/images/mockups-3d/placeholder-phone.avif";
const DEFAULT_CAMERA_POS: [number, number, number] = [0, 0, 1.5];
const DRACO_URL = "/draco/";

useGLTF.preload("/models/iphone-17-pro-max.glb", DRACO_URL);

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
    glow = 1.0,
    environment = "studio",
    isSelected = false,
    isHovered = false,
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
    onApi?: (api: IPhone17ProMax3DApi | null) => void;
    onLoaded?: () => void;
    videoElement?: HTMLVideoElement | null;
    shadowIntensity?: number;
    shadowColor?: string;
    autoRotate?: boolean;
    rotationSpeed?: number;
    glow?: number;
    environment?: EnvironmentPreset;
    isSelected?: boolean;
    isHovered?: boolean;
}) {
    const { gl, scene, camera, invalidate, size } = useThree();
    const gltf = useGLTF("/models/iphone-17-pro-max.glb", DRACO_URL);

    const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

    const orbitRef = useRef<OrbitControlsType | null>(null);
    const lastLoadedImageUrlRef = useRef<string | null>(null);
    const lastLoadedMaskKeyRef = useRef<string | null>(null);
    const lastLoadedCropKeyRef = useRef<string | null>(null);
    const wallpaperMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
    const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
    const onApiRef = useRef(onApi);

    const composerRef = useRef<EffectComposer | null>(null);
    const outlinePassRef = useRef<OutlinePass | null>(null);

    useLayoutEffect(() => {
        onApiRef.current = onApi;
    });

    useFrame(() => {
        if (videoElement && videoTextureRef.current) {
            videoTextureRef.current.needsUpdate = true;
        }
    });

    useEffect(() => {
        clonedScene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.name.includes("HkNSnYzBPABcqwM")) {
                    const targetMat = (child.material as THREE.MeshPhysicalMaterial).clone();
                    targetMat.normalMap = null;
                    targetMat.roughnessMap = null;
                    targetMat.metalnessMap = null;
                    targetMat.clearcoatMap = null;
                    targetMat.emissiveMap = null;
                    targetMat.emissive = new THREE.Color(0x000000);
                    targetMat.roughness = 0.8;
                    targetMat.metalness = 0.1;
                    targetMat.envMapIntensity = 0.1;

                    child.material = targetMat;
                    wallpaperMatRef.current = targetMat;
                }
            }
        });
        invalidate();
    }, [clonedScene, invalidate]);

    useEffect(() => {
        const capturedOnApi = onApiRef.current;
        const RENDER_PIXEL_RATIO = 2;

        const api: IPhone17ProMax3DApi = {
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

                composerRef.current?.setSize(freshW, freshH);
                composerRef.current?.setPixelRatio(gl.getPixelRatio());
                outlinePassRef.current?.resolution.set(freshW, freshH);

                invalidate();
            },
            hasBuiltInShadow: true,
        };
        capturedOnApi?.(api);
        return () => capturedOnApi?.(null);
    }, [gl, scene, camera, cameraRef, invalidate]);

    useEffect(() => {
        onLoaded?.();
    }, [onLoaded]);

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

        const updateTextureTransform = () => {
            applyTextureCover(
                tex,
                videoElement.videoWidth,
                videoElement.videoHeight,
                TEX_W,
                TEX_H
            );
            invalidate();
        };

        if (videoElement.readyState >= 1) {
            updateTextureTransform();
        } else {
            videoElement.addEventListener('loadedmetadata', updateTextureTransform);
        }

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
            if (mat.map) mat.map.needsUpdate = true;
            invalidate();
        };
        applyVideoTex();

        return () => {
            videoElement.removeEventListener('loadedmetadata', updateTextureTransform);
            if (videoTextureRef.current === tex) {
                videoTextureRef.current = null;
            }
            tex.dispose();
        };
    }, [videoElement, invalidate]);

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
                tex.flipY = false;
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.generateMipmaps = true;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.anisotropy = gl.capabilities.getMaxAnisotropy();

                mat.map = tex;
                mat.color.set(0xffffff);
                mat.needsUpdate = true;

                lastLoadedImageUrlRef.current = placeholderKey;
                lastLoadedMaskKeyRef.current = null;
                lastLoadedCropKeyRef.current = null;
                invalidate();
            };
            img.onerror = () => {
                if (mat.map) {
                    mat.map.dispose();
                    mat.map = null;
                }
                mat.color.set(0x1a1a1a);
                mat.needsUpdate = true;
                lastLoadedImageUrlRef.current = placeholderKey;
                invalidate();
            };
            img.src = PLACEHOLDER_PHONE_URL;
            return;
        }

        if (
            lastLoadedImageUrlRef.current === imageUrl &&
            lastLoadedMaskKeyRef.current === maskKey &&
            lastLoadedCropKeyRef.current === cropKey
        ) return;

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
            tex.flipY = false;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.generateMipmaps = true;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.anisotropy = gl.capabilities.getMaxAnisotropy();

            mat.map = tex;
            mat.color.set(0xffffff);
            mat.needsUpdate = true;
            invalidate();

            lastLoadedImageUrlRef.current = imageUrl;
            lastLoadedMaskKeyRef.current = maskKey;
            lastLoadedCropKeyRef.current = cropKey;
        };
        img.src = imageUrl;
    }, [imageUrl, imageMaskConfig, cropArea, gl, videoElement, invalidate]);

    useEffect(() => {
        return () => {
            if (wallpaperMatRef.current && wallpaperMatRef.current.map) {
                wallpaperMatRef.current.map.dispose();
            }
        };
    }, []);

    const prevRotationRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (prevRotationRef.current?.x === initialRotationX && prevRotationRef.current?.y === initialRotationY) return;

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
    }, [initialRotationX, initialRotationY, zoom, invalidate]);

    useEffect(() => {
        const root = rootRef.current;
        if (root) {
            root.rotation.z = initialRotationZ * (Math.PI / 180);
            invalidate();
        }
    }, [initialRotationZ, invalidate]);

    useEffect(() => {
        const composer = new EffectComposer(gl);
        composer.addPass(new RenderPass(scene, camera));

        const outlinePass = new OutlinePass(
            new THREE.Vector2(size.width, size.height),
            scene,
            camera
        );

        outlinePass.edgeStrength = 8;
        outlinePass.edgeGlow = 0;
        outlinePass.edgeThickness = 3;
        outlinePass.pulsePeriod = 0;
        outlinePass.visibleEdgeColor.set(0xffffff);
        outlinePass.hiddenEdgeColor.set(0xffffff);

        composer.addPass(outlinePass);
        composer.addPass(new OutputPass());

        composerRef.current = composer;
        outlinePassRef.current = outlinePass;
        invalidate();

        return () => {
            outlinePass.dispose();
            composer.dispose();
            composerRef.current = null;
            outlinePassRef.current = null;
        };
    }, [gl, scene, camera]);

    useEffect(() => {
        composerRef.current?.setSize(size.width, size.height);
        composerRef.current?.setPixelRatio(gl.getPixelRatio());
        outlinePassRef.current?.resolution.set(size.width, size.height);
        invalidate();
    }, [size, gl, invalidate]);

    useEffect(() => {
        const outlinePass = outlinePassRef.current;
        if (!outlinePass) return;

        const showOutline = isSelected || isHovered;
        outlinePass.selectedObjects = showOutline && rootRef.current ? [rootRef.current] : [];
        const color = isSelected ? 0x3b82f6 : 0xffffff;
        outlinePass.visibleEdgeColor.set(color);
        outlinePass.hiddenEdgeColor.set(color);

        invalidate();
    }, [isSelected, isHovered, invalidate]);

    useFrame(() => {
        composerRef.current?.render();
    }, 1);

    const shadowT = Math.max(0, Math.min(1, shadowIntensity));
    const showContactShadow = shadowT > 0.01;
    const contactOpacity = shadowT * 0.65;
    const contactBlur = 1.5 + shadowT * 1.5;

    return (
        <>
            <PerspectiveCamera ref={cameraRef} makeDefault fov={40} near={0.01} far={100} position={DEFAULT_CAMERA_POS} zoom={zoom} />
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
            <directionalLight position={[3, 6, 5]} intensity={0.6} />
            <directionalLight position={[-4, -2, 3]} intensity={0.25} color="#c8d8ff" />
            <directionalLight position={[0, -5, 5]} intensity={0.35} />

            {showContactShadow && (
                <ContactShadows
                    position={[0, -0.55, 0]}
                    opacity={contactOpacity}
                    scale={3}
                    blur={contactBlur}
                    far={4}
                    color={shadowColor}
                    resolution={512}
                />
            )}

            <group ref={rootRef} rotation={[0, 0, 0]} scale={1} dispose={null}>
                <primitive object={clonedScene} scale={4.2} rotation={[0, 0, 0]} castShadow receiveShadow />
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
    isSelected,
    isHovered,
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
    onApi?: (api: IPhone17ProMax3DApi | null) => void;
    onMount?: (canvas: HTMLCanvasElement) => void;
    videoElement?: HTMLVideoElement | null;
    shadowIntensity?: number;
    shadowColor?: string;
    autoRotate?: boolean;
    rotationSpeed?: number;
    glow?: number;
    environment?: EnvironmentPreset;
    isSelected?: boolean;
    isHovered?: boolean;
}) {
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
                    powerPreference: "high-performance"
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
                        onLoaded={handleLoaded}
                        videoElement={videoElement}
                        shadowIntensity={shadowIntensity}
                        shadowColor={shadowColor}
                        autoRotate={autoRotate}
                        rotationSpeed={rotationSpeed}
                        glow={glow}
                        environment={environment}
                        isSelected={isSelected}
                        isHovered={isHovered}
                    />
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

export function IPhone17ProMax3DViewer({
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
    environment,
    isSelected = false,
    isHovered = false,
    onHoverChange,
    onSelectChange,
}: Props) {
    const rootRef = useRef<THREE.Group | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const canvasElRef = useRef<HTMLCanvasElement | null>(null);
    const raycasterRef = useRef(new THREE.Raycaster());

    const [grabbing, setGrabbing] = useState(false);
    const [modelHovered, setModelHovered] = useState(false);

    const t = Math.max(0, Math.min(1, shadowIntensity));
    const tEased = t * t;
    const computedBlur = tEased * 60;
    const computedOpacity = tEased * 0.7;
    const shadowRgba = shadowColor.startsWith("#") ? parseShadowColor(shadowColor, computedOpacity) : shadowColor;
    const hasShadow = t > 0.01;

    const maskStyle = GetMediaMaskStyles(imageMaskConfig, {
        inset: 400,
        deviceWidth: 480,
        deviceHeight: 1000,
    });

    const hitsModel = (clientX: number, clientY: number): boolean => {
        const canvas = canvasElRef.current;
        const cam = cameraRef.current;
        const model = rootRef.current;
        if (!canvas || !cam || !model) return false;

        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;

        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), cam);
        return raycasterRef.current.intersectObject(model, true).length > 0;
    };

    const handleCanvasMount = (canvas: HTMLCanvasElement) => {
        canvasElRef.current = canvas;
        onMount?.(canvas);
    };

    useEffect(() => {
        const onWinPointerUp = () => setGrabbing(false);
        window.addEventListener("pointerup", onWinPointerUp);
        return () => window.removeEventListener("pointerup", onWinPointerUp);
    }, []);

    return (
        <>
            <div
                style={{
                    display: "inline-block",
                    transformOrigin: "top center",
                    width: 480,
                    height: 1000 + (hasShadow ? computedBlur * 0.8 : 0),
                    marginTop: "100px",
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
                                pointerEvents: "none"
                            }}
                        />
                    )}

                    <div
                        style={{
                            position: "absolute",
                            inset: "-400px",
                            zIndex: 2,
                            overflow: "visible",
                            cursor: grabbing ? "grabbing" : modelHovered ? "grab" : "default",
                            transition: "filter 0.15s ease",
                            pointerEvents: "none",
                            ...maskStyle,
                        }}
                        onPointerDownCapture={(e) => {
                            const hit = hitsModel(e.clientX, e.clientY);
                            if (!hit) {
                                onSelectChange?.(false);
                                e.stopPropagation();
                                return;
                            }
                            onSelectChange?.(true);
                            setGrabbing(true);
                        }}
                        onPointerMove={(e) => {
                            if (!grabbing) {
                                const isCurrentlyHovering = hitsModel(e.clientX, e.clientY);
                                if (isCurrentlyHovering !== modelHovered) {
                                    setModelHovered(isCurrentlyHovering);
                                    onHoverChange?.(isCurrentlyHovering);
                                }
                            }
                        }}
                        onPointerUp={() => setGrabbing(false)}
                        onPointerLeave={() => {
                            setGrabbing(false);
                            if (modelHovered) {
                                setModelHovered(false);
                                onHoverChange?.(false);
                            }
                        }}
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
                            onMount={handleCanvasMount}
                            videoElement={videoElement}
                            shadowIntensity={shadowIntensity}
                            shadowColor={shadowColor}
                            autoRotate={autoRotate}
                            rotationSpeed={rotationSpeed}
                            glow={glow}
                            environment={environment}
                            isSelected={isSelected}
                            isHovered={modelHovered}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}