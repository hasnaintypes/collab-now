"use client";

import { useOthers, useSelf } from "@liveblocks/react/suspense";
import Image from "next/image";

const MAX_VISIBLE = 4;

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ActiveCollaborators() {
  const self = useSelf();
  const others = useOthers();
  // Previously only `others` rendered, so opening a document alone (or
  // with exactly one other person) showed either nothing or just one
  // avatar — never a real "who's here" stack. Your own presence counts
  // too: self first, then everyone else.
  const collaborators = [
    ...(self?.info ? [self.info] : []),
    ...others.map((other) => other.info),
  ];

  if (collaborators.length === 0) return null;

  const visible = collaborators.slice(0, MAX_VISIBLE);
  const overflowCount = collaborators.length - visible.length;

  return (
    <ul className="flex -space-x-2.5">
      {visible.map(({ id, avatar, name, color }) => {
        // Two concentric rings in one box-shadow (a plain Tailwind `ring`
        // utility would just get overwritten by this inline style, since
        // both set the same CSS property) — a background-colored ring to
        // separate overlapping avatars, then an outer ring in the
        // collaborator's own assigned color so each one stays visually
        // identifiable even once avatars start stacking.
        const rings = `0 0 0 2px var(--background), 0 0 0 3.5px ${color}`;
        return (
          <li
            key={id}
            title={name}
            className="group relative transition-transform hover:z-10 hover:-translate-y-0.5"
          >
            {avatar ? (
              <Image
                src={avatar}
                alt={name}
                width={30}
                height={30}
                className="size-[30px] rounded-full object-cover shadow-sm transition-shadow group-hover:shadow-md"
                style={{ boxShadow: rings }}
              />
            ) : (
              <div
                className="flex size-[30px] items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-sm transition-shadow group-hover:shadow-md"
                style={{ backgroundColor: color, boxShadow: rings }}
              >
                {initialsFor(name)}
              </div>
            )}
          </li>
        );
      })}
      {overflowCount > 0 && (
        <li
          title={collaborators
            .slice(MAX_VISIBLE)
            .map((c) => c.name)
            .join(", ")}
          className="flex size-[30px] items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground shadow-sm"
          style={{ boxShadow: "0 0 0 2px var(--background)" }}
        >
          +{overflowCount}
        </li>
      )}
    </ul>
  );
}
