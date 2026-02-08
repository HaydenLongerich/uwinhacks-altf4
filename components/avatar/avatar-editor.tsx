"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type HairStyle = "crop" | "medium" | "bun";
type OutfitPreset = "hoodie" | "blazer" | "vest" | "pilot-jacket";
type BackdropPreset = "studio" | "sunset" | "ocean";

interface AvatarConfig {
  skinTone: string;
  hairColor: string;
  hairStyle: HairStyle;
  outfit: OutfitPreset;
  background: BackdropPreset;
}

const BACKGROUND_COLORS: Record<BackdropPreset, string> = {
  studio: "#0f172a",
  sunset: "#3f1a4f",
  ocean: "#0d2c38",
};

const ADVANCED_ITEMS: OutfitPreset[] = ["pilot-jacket"];
const ALL_OUTFITS: OutfitPreset[] = ["hoodie", "blazer", "vest", "pilot-jacket"];

function AvatarModel({ config }: { config: AvatarConfig }) {
  const outfitColor = useMemo(() => {
    if (config.outfit === "hoodie") return "#2563eb";
    if (config.outfit === "blazer") return "#334155";
    if (config.outfit === "vest") return "#065f46";
    return "#7f1d1d";
  }, [config.outfit]);

  return (
    <group position={[0, -0.8, 0]}>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.55, 48, 48]} />
        <meshStandardMaterial color={config.skinTone} roughness={0.7} />
      </mesh>

      <mesh position={[0, 0.4, 0]}>
        <capsuleGeometry args={[0.55, 1.45, 12, 24]} />
        <meshStandardMaterial color={outfitColor} roughness={0.6} metalness={0.08} />
      </mesh>

      <mesh position={[0, 1.68, 0.5]}>
        <sphereGeometry args={[0.08, 20, 20]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.2, 1.66, 0.46]}>
        <sphereGeometry args={[0.05, 20, 20]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[-0.2, 1.66, 0.46]}>
        <sphereGeometry args={[0.05, 20, 20]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {config.hairStyle === "crop" ? (
        <mesh position={[0, 1.9, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={config.hairColor} />
        </mesh>
      ) : null}

      {config.hairStyle === "medium" ? (
        <mesh position={[0, 1.82, 0]}>
          <capsuleGeometry args={[0.52, 0.45, 8, 16]} />
          <meshStandardMaterial color={config.hairColor} />
        </mesh>
      ) : null}

      {config.hairStyle === "bun" ? (
        <group>
          <mesh position={[0, 1.84, 0]}>
            <sphereGeometry args={[0.48, 32, 32]} />
            <meshStandardMaterial color={config.hairColor} />
          </mesh>
          <mesh position={[0, 2.24, -0.14]}>
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial color={config.hairColor} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

export function AvatarEditor({
  userId,
  level,
  initialConfig,
  storageReady,
}: {
  userId: string;
  level: number;
  initialConfig: Record<string, unknown> | null;
  storageReady: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [config, setConfig] = useState<AvatarConfig>({
    skinTone:
      typeof initialConfig?.skinTone === "string"
        ? initialConfig.skinTone
        : "#f1c9a5",
    hairColor:
      typeof initialConfig?.hairColor === "string"
        ? initialConfig.hairColor
        : "#1f2937",
    hairStyle:
      initialConfig?.hairStyle === "medium" || initialConfig?.hairStyle === "bun"
        ? initialConfig.hairStyle
        : "crop",
    outfit:
      initialConfig?.outfit === "blazer" ||
      initialConfig?.outfit === "vest" ||
      initialConfig?.outfit === "pilot-jacket"
        ? initialConfig.outfit
        : "hoodie",
    background:
      initialConfig?.background === "sunset" || initialConfig?.background === "ocean"
        ? initialConfig.background
        : "studio",
  });

  const background = BACKGROUND_COLORS[config.background];

  const updateConfig = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const saveAvatar = async () => {
    if (!storageReady) {
      setStatus("Schema is not installed yet. Run the SQL migration first.");
      return;
    }

    setIsSaving(true);
    setStatus(null);

    try {
      const avatarPayload = {
        user_id: userId,
        face_preset: config.skinTone,
        hair_style: config.hairStyle,
        hair_color: config.hairColor,
        outfit_style: config.outfit,
        background_style: config.background,
        config_json: config,
        unlocked_level_required: config.outfit === "pilot-jacket" ? 5 : 1,
        is_active: true,
      };

      const { error: avatarError } = await supabase.from("avatars").upsert(avatarPayload, {
        onConflict: "user_id",
      });
      if (avatarError) {
        throw avatarError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_completed: true,
          avatar_config: config,
        })
        .eq("user_id", userId);

      if (profileError) {
        throw profileError;
      }

      setStatus("Avatar saved.");
      router.push("/dashboard");
      router.refresh();
    } catch (unknownError) {
      setStatus(
        unknownError instanceof Error
          ? unknownError.message
          : "Could not save avatar.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>3D Avatar Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[460px] overflow-hidden rounded-xl border border-slate-200">
            <Canvas
              camera={{ position: [0, 1.2, 3], fov: 40 }}
              style={{ background }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[2.5, 2.4, 3.2]} intensity={1.2} />
              <directionalLight position={[-1.5, 0.8, -2]} intensity={0.35} />
              <AvatarModel config={config} />
              <OrbitControls enablePan={false} minDistance={2} maxDistance={4.2} />
            </Canvas>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Customize</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="skin-tone">Face Tone</Label>
            <Input
              id="skin-tone"
              type="color"
              value={config.skinTone}
              onChange={(event) => updateConfig("skinTone", event.target.value)}
              className="h-10 border-slate-200 bg-transparent p-1"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hair-color">Hair Color</Label>
            <Input
              id="hair-color"
              type="color"
              value={config.hairColor}
              onChange={(event) => updateConfig("hairColor", event.target.value)}
              className="h-10 border-slate-200 bg-transparent p-1"
            />
          </div>

          <div className="grid gap-2">
            <Label>Hair Style</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["crop", "medium", "bun"] as HairStyle[]).map((style) => (
                <Button
                  key={style}
                  type="button"
                  variant={config.hairStyle === style ? "default" : "outline"}
                  className={
                    config.hairStyle === style
                      ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                      : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
                  }
                  onClick={() => updateConfig("hairStyle", style)}
                >
                  {style}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Outfit</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_OUTFITS.map((outfit) => {
                const isAdvanced = ADVANCED_ITEMS.includes(outfit);
                const locked = isAdvanced && level < 5;
                return (
                  <Button
                    key={outfit}
                    type="button"
                    variant={config.outfit === outfit ? "default" : "outline"}
                    className={
                      config.outfit === outfit
                        ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
                    }
                    onClick={() => {
                      if (!locked) {
                        updateConfig("outfit", outfit);
                      }
                    }}
                    disabled={locked}
                  >
                    {locked ? `${outfit} (L5)` : outfit}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Background</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["studio", "sunset", "ocean"] as BackdropPreset[]).map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={config.background === preset ? "default" : "outline"}
                  className={
                    config.background === preset
                      ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                      : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
                  }
                  onClick={() => updateConfig("background", preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={saveAvatar}
            disabled={isSaving}
            className="mt-2 w-full bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
          >
            {isSaving ? "Saving..." : "Save Avatar"}
          </Button>
          {status ? <p className="text-xs text-slate-600">{status}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
