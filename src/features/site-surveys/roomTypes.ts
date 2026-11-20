/** Room types accepted by the backend (apartments/entities/room.entity ROOM_TYPES). */
export const ROOM_TYPES: { value: string; label: string }[] = [
  { value: 'LIVING_ROOM', label: 'Living Room' },
  { value: 'BEDROOM', label: 'Bedroom' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'DINING_ROOM', label: 'Dining Room' },
  { value: 'BATHROOM', label: 'Bathroom' },
  { value: 'WORKING_ROOM', label: 'Working Room' },
  { value: 'BALCONY', label: 'Balcony' },
  { value: 'OTHER', label: 'Other' },
];

export const roomTypeLabel = (value: string) => ROOM_TYPES.find((type) => type.value === value)?.label ?? value;

/** Default name for a room type: "Bedroom", then "Bedroom 2", "Bedroom 3"... when `existing` already has that kind of room. */
export function suggestRoomName(roomType: string, existing: readonly string[]): string {
  const label = roomTypeLabel(roomType);
  const pattern = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: (\\d+))?$`, 'i');
  const matches = existing.map((name) => pattern.exec(name.trim())).filter((match): match is RegExpExecArray => match !== null);
  if (!matches.length) return label;
  const highest = Math.max(...matches.map((match) => (match[1] ? Number(match[1]) : 1)));
  return `${label} ${Math.max(highest, matches.length) + 1}`;
}
