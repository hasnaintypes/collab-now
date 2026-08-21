"use client";

import { useOthers } from "@liveblocks/react/suspense";

export default function ActiveCollaborators() {
  const others = useOthers();
  const collaborators = others.map((other) => other.info);

  return (
    <ul className="flex -space-x-2">
      {collaborators.map(({ id, avatar, name, color }) => (
        <li key={id} title={name}>
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="size-8 rounded-full ring-2 ring-background object-cover"
              style={{ borderColor: color }}
            />
          ) : (
            <div
              className="flex size-8 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-background"
              style={{ backgroundColor: color }}
            >
              {name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
