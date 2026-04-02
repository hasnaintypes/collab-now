"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { updateUser } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";

interface ProfileFormProps {
  name: string;
  image: string;
}

export default function ProfileForm({ name, image }: ProfileFormProps) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: { name, image },
  });

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
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Avatar URL
        </label>
        <Input
          {...register("image")}
          placeholder="https://example.com/avatar.jpg"
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
