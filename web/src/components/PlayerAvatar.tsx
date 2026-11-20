import type { PlayerRow } from "../lib/stats";

export function PlayerAvatar({
  row,
  size
}: {
  row: Pick<PlayerRow, "name" | "photo">;
  size?: string;
}) {
  const initial = row.name.trim().charAt(0).toUpperCase();
  return row.photo ? (
    <img
      className={"avatar" + (size ? " " + size : "")}
      src={row.photo}
      alt={row.name + " 头像"}
      loading="lazy"
    />
  ) : (
    <span className={"avatar avatar-fallback" + (size ? " " + size : "")} aria-hidden="true">
      {initial}
    </span>
  );
}
