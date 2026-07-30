"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  VRM,
  VRMLoaderPlugin,
  VRMUtils,
  VRMExpressionPresetName,
} from "@pixiv/three-vrm";

interface VRMAvatarProps {
  /** Analyser yang di-tap dari graph pemutaran audio AI. Menggerakkan lip sync. */
  analyser: React.RefObject<AnalyserNode | null>;
  /** Berkas VRM dari /public. */
  url?: string;
  /** Saat false, kepala/mata berhenti mengikuti kursor (hanya idle drift). */
  lookAtCursor?: boolean;
}

/**
 * Menganimasikan VRM supaya terasa hidup (port dari mode Natural read-japan):
 *  - mulut terbuka sesuai amplitudo suara (lip sync)
 *  - kepala + mata mengikuti kursor
 *  - kedipan berkala
 *  - napas, pergeseran berat badan, gerak lengan halus
 *  - ekspresi "happy" + anggukan halus saat AI berbicara
 */
function VRMModel({
  analyser,
  url,
  lookAtCursor,
}: {
  analyser: React.RefObject<AnalyserNode | null>;
  url: string;
  lookAtCursor: boolean;
}) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const { camera, pointer } = useThree();

  const mouthRef = useRef(0);
  const waveRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const talkRef = useRef(0);
  const lookRef = useRef({ x: 0, y: 0 });

  const nextBlinkRef = useRef(1.5);
  const blinkTimerRef = useRef(0);
  const blinkingRef = useRef(false);

  const framedRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader
      .loadAsync(url)
      .then((gltf) => {
        if (disposed) return;
        const loaded = gltf.userData.vrm as VRM;

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        VRMUtils.rotateVRM0(loaded);

        loaded.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        const h = loaded.humanoid;
        const lUpper = h?.getNormalizedBoneNode("leftUpperArm");
        const rUpper = h?.getNormalizedBoneNode("rightUpperArm");
        const lLower = h?.getNormalizedBoneNode("leftLowerArm");
        const rLower = h?.getNormalizedBoneNode("rightLowerArm");
        if (lUpper) lUpper.rotation.z = 1.25;
        if (rUpper) rUpper.rotation.z = -1.25;
        if (lLower) lLower.rotation.z = 0.2;
        if (rLower) rLower.rotation.z = -0.2;

        if (loaded.lookAt) loaded.lookAt.autoUpdate = false;

        framedRef.current = false;
        setVrm(loaded);
      })
      .catch((err) => {
        console.error("Failed to load VRM:", err);
      });

    return () => {
      disposed = true;
    };
  }, [url]);

  useFrame((_, delta) => {
    if (!vrm) return;
    const em = vrm.expressionManager;
    const t = performance.now() / 1000;
    const dt = Math.min(delta, 0.05);

    if (!framedRef.current) {
      const headNode =
        vrm.humanoid?.getRawBoneNode("head") ??
        vrm.humanoid?.getNormalizedBoneNode("head");
      if (headNode) {
        const p = new THREE.Vector3();
        headNode.getWorldPosition(p);
        if (p.y > 0.1) {
          camera.position.set(0, p.y, p.z + 1.3);
          camera.lookAt(0, p.y - 0.13, 0);
          framedRef.current = true;
        }
      }
    }

    // ── Lip sync dari amplitudo audio langsung ──────────
    let target = 0;
    const a = analyser.current;
    if (a) {
      if (!waveRef.current || waveRef.current.length !== a.fftSize) {
        waveRef.current = new Uint8Array(new ArrayBuffer(a.fftSize));
      }
      const buf = waveRef.current;
      a.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const x = (buf[i] - 128) / 128;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / buf.length);
      target = Math.min(1, Math.max(0, (rms - 0.02) * 6));
    }
    const k = target > mouthRef.current ? 0.5 : 0.25;
    mouthRef.current += (target - mouthRef.current) * k;
    talkRef.current += ((target > 0.15 ? 1 : 0) - talkRef.current) * 0.08;

    if (em) {
      em.setValue(VRMExpressionPresetName.Aa, mouthRef.current);
      em.setValue(VRMExpressionPresetName.Happy, talkRef.current * 0.55);

      blinkTimerRef.current += dt;
      if (blinkingRef.current) {
        const bt = blinkTimerRef.current / 0.12;
        const w = bt < 0.5 ? bt * 2 : Math.max(0, 2 - bt * 2);
        em.setValue(VRMExpressionPresetName.Blink, Math.min(1, w));
        if (bt >= 1) {
          blinkingRef.current = false;
          blinkTimerRef.current = 0;
          nextBlinkRef.current = 2 + Math.random() * 4;
          em.setValue(VRMExpressionPresetName.Blink, 0);
        }
      } else if (blinkTimerRef.current >= nextBlinkRef.current) {
        blinkingRef.current = true;
        blinkTimerRef.current = 0;
      }
    }

    const tx = lookAtCursor ? THREE.MathUtils.clamp(pointer.x, -1, 1) : 0;
    const ty = lookAtCursor ? THREE.MathUtils.clamp(pointer.y, -1, 1) : 0;
    lookRef.current.x += (tx - lookRef.current.x) * 0.08;
    lookRef.current.y += (ty - lookRef.current.y) * 0.08;

    const head = vrm.humanoid?.getNormalizedBoneNode("head");
    if (head) {
      head.rotation.y = lookRef.current.x * 0.5 + Math.sin(t * 0.5) * 0.04;
      head.rotation.x =
        lookRef.current.y * 0.35 +
        Math.sin(t * 0.4) * 0.03 +
        Math.sin(t * 6) * 0.03 * talkRef.current;
    }
    const spine = vrm.humanoid?.getNormalizedBoneNode("spine");
    if (spine) {
      spine.rotation.x = Math.sin(t * 1.6) * 0.02;
      spine.rotation.z = Math.sin(t * 0.35) * 0.02;
    }
    const chest = vrm.humanoid?.getNormalizedBoneNode("chest");
    if (chest) {
      chest.rotation.x = Math.sin(t * 1.6 + 0.3) * 0.012;
    }
    const hips = vrm.humanoid?.getNormalizedBoneNode("hips");
    if (hips) {
      hips.rotation.y = Math.sin(t * 0.35) * 0.03;
    }
    const lUpper = vrm.humanoid?.getNormalizedBoneNode("leftUpperArm");
    const rUpper = vrm.humanoid?.getNormalizedBoneNode("rightUpperArm");
    const rLower = vrm.humanoid?.getNormalizedBoneNode("rightLowerArm");
    if (lUpper) lUpper.rotation.z = 1.25 + Math.sin(t * 0.9) * 0.04;
    if (rUpper) rUpper.rotation.z = -1.25 - Math.sin(t * 0.9 + 0.5) * 0.04;
    if (rLower) rLower.rotation.z = -0.2;

    vrm.update(dt);

    vrm.lookAt?.applier?.applyYawPitch(
      lookRef.current.x * 18,
      lookRef.current.y * 12,
    );
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}

export default function VRMAvatar({
  analyser,
  url = "/models/aoi.vrm",
  lookAtCursor = true,
}: VRMAvatarProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.32, 1.3], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <ambientLight intensity={1.4} />
      <directionalLight position={[1, 2, 2]} intensity={1.6} />
      <directionalLight position={[-1, 1, -1]} intensity={0.4} />
      <VRMModel analyser={analyser} url={url} lookAtCursor={lookAtCursor} />
    </Canvas>
  );
}
