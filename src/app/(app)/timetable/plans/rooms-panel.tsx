"use client";

import { Archive, ArchiveRestore, Plus } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { Alert, Badge, Button, Input } from "@/components/ui";
import { addRoomAction, setRoomArchivedAction, type FormState } from "@/server/actions/timetable";
import type { RoomRow } from "@/server/timetable";

function RoomToggle({ room }: { room: RoomRow }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setRoomArchivedAction, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="roomId" value={room.id} />
      <input type="hidden" name="name" value={room.name} />
      <input type="hidden" name="archive" value={room.isArchived ? "0" : "1"} />
      <Button
        type="submit"
        size="compact"
        variant="ghost"
        icon={room.isArchived ? ArchiveRestore : Archive}
        loading={pending}
        aria-label={`${room.isArchived ? "Restore" : "Archive"} ${room.name}`}
      >
        {room.isArchived ? "Restore" : "Archive"}
      </Button>
      {state.errors?.form && <span className="text-label text-danger">{state.errors.form}</span>}
    </form>
  );
}

/** Rooms lessons can be held in. Archived rooms stay on past lessons. */
export function RoomsPanel({ rooms }: { rooms: RoomRow[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addRoomAction, {});
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.ok) input.current?.focus();
  }, [state]);
  return (
    <div className="flex flex-col gap-3">
      {rooms.length === 0 ? (
        <p className="text-ink-secondary">
          No rooms yet. Rooms are optional; add them to catch double bookings of labs and halls.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider">
          {rooms.map((r) => (
            <li key={r.id} className="flex min-h-10 items-center justify-between gap-3">
              <span className="font-medium">
                {r.name} {r.isArchived && <Badge>Archived</Badge>}
              </span>
              <RoomToggle room={r} />
            </li>
          ))}
        </ul>
      )}
      <form action={action} aria-label="Add a room" className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="room-name" className="text-label font-semibold">
              Room name
            </label>
            <Input
              ref={input}
              id="room-name"
              name="name"
              placeholder="e.g. Assembly hall"
              aria-invalid={state.errors?.name ? true : undefined}
              aria-describedby={state.errors?.name ? "room-name-error" : undefined}
            />
          </div>
          <Button type="submit" icon={Plus} loading={pending}>
            Add room
          </Button>
        </div>
        {state.errors?.name && (
          <p id="room-name-error" className="text-label font-medium text-danger">
            {state.errors.name}
          </p>
        )}
        {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}
      </form>
    </div>
  );
}
