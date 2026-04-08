"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { updateUser } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Upload } from "lucide-react";

interface ProfileFormProps {
  name: string;
  image: string;
}

export default function ProfileForm({ name, image }: ProfileFormProps) {
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<string>(image);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: { name, image },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      setValue("image", base64);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: { name: string; image: string }) => {
    try {
      await updateUser({
        name: data.name,
        image: data.image || undefined,
      });
      setEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const handleCancel = () => {
    reset({ name, image });
    setPreview(image);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-2 bg-primary px-8 py-3.5 text-sm font-medium uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Pencil className="size-4" />
        Edit Profile
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md space-y-4 rounded-sm bg-muted/50 p-6"
    >
      {/* Avatar upload */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Profile Picture
        </label>
        <div className="flex items-center gap-4">
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="size-16 rounded-sm object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center bg-muted text-lg font-bold text-muted-foreground rounded-sm">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Upload className="size-4" />
            Upload Photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Full Name
        </label>
        <Input
          {...register("name", { required: true, minLength: 2 })}
          placeholder="Your name"
          className="h-9"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Check className="size-4" />
          {isSubmitting ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}
