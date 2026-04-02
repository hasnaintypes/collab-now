"use client";

import { createDocument } from "@/lib/actions/room.actions";
import { useRouter } from "next/navigation";

export default function AddDocumentBtn({ userId, email }: AddDocumentBtnProps) {
  const router = useRouter();

  const handleAdd = async () => {
    try {
      const room = await createDocument({ userId, email });
      if (room) router.push(`/documents/${room.id}`);
    } catch (error) {
      console.error(`Failed to create document: ${error}`);
    }
  };

  return (
    <button
      onClick={handleAdd}
      className="rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
    >
      New Document
    </button>
  );
}
