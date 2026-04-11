"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateUser } from "@/lib/auth/client";
import { Input } from "@/components/ui/input";
import { Camera, Check, X, Pencil } from "lucide-react";

interface ProfileFormProps {
  name: string;
  email: string;
  image: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfileForm({
  name,
  email,
  image,
}: ProfileFormProps) {
  const [editingName, setEditingName] = useState(false);
  const [currentName, setCurrentName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string>(image);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setPreview(base64);
      setSaving(true);
      try {
        await updateUser({ image: base64 });
        router.refresh();
      } catch (error) {
        console.error("Failed to update avatar:", error);
        setPreview(image);
      }
      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleNameSave = async () => {
    if (!currentName.trim() || currentName.trim().length < 2) return;
    setSaving(true);
    try {
      await updateUser({ name: currentName.trim() });
      setEditingName(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update name:", error);
      setCurrentName(name);
    }
    setSaving(false);
  };

  const handleNameCancel = () => {
    setCurrentName(name);
    setEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleNameSave();
    if (e.key === "Escape") handleNameCancel();
  };

  const startEditingName = () => {
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  };

  return (
    <>
      {/* Avatar with edit overlay */}
      <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
        {preview ? (
          <img
            src={preview}
            alt={currentName}
            className="size-36 rounded-none object-cover grayscale brightness-105 md:size-48"
          />
        ) : (
          <div className="flex size-36 items-center justify-center bg-muted text-4xl font-bold text-muted-foreground md:size-48 md:text-5xl">
            {getInitials(currentName)}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="size-8 text-white" />
        </div>
        {saving && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-xs font-medium text-white">Saving...</span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Name + Email (name is editable inline) */}
      <div className="space-y-2">
        {editingName ? (
          <div className="flex items-center gap-2">
            <Input
              ref={nameInputRef}
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              className="h-auto border-border/50 px-2 py-1 text-5xl font-extrabold tracking-tighter md:text-7xl"
            />
            <button
              onClick={handleNameSave}
              disabled={saving}
              className="rounded-sm bg-primary p-2 text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Check className="size-5" />
            </button>
            <button
              onClick={handleNameCancel}
              className="rounded-sm p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={startEditingName}
            className="group flex items-center gap-3 text-left"
          >
            <h1 className="text-5xl font-extrabold tracking-tighter md:text-7xl">
              {currentName}
            </h1>
            <Pencil className="size-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}
        <p className="text-lg uppercase tracking-widest text-muted-foreground">
          {email}
        </p>
      </div>
    </>
  );
}
