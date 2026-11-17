import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronLeft, ChevronRight, DoorOpen, LoaderCircle, Plus, Search, X } from 'lucide-react';
import { Footer, Header } from '@/components/layout';
import { ApiError, getCurrentUser } from '@/services/authService';
import { apartmentService, type Apartment, type ApartmentFloor, type ApartmentPatch, type ApartmentPayload, type ApartmentRoom, type PropertyType } from '@/services/apartmentService';
import type { UserRole } from '@/types/role';

const PAGE_SIZE = 20;

const ROOM_TYPES: { value: string; label: string }[] = [
  { value: 'LIVING_ROOM', label: 'Living Room' },
  { value: 'BEDROOM', label: 'Bedroom' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'DINING_ROOM', label: 'Dining Room' },
  { value: 'BATHROOM', label: 'Bathroom' },
  { value: 'WORKING_ROOM', label: 'Working Room' },
  { value: 'BALCONY', label: 'Balcony' },
  { value: 'OTHER', label: 'Other' },
];
const roomTypeLabel = (value: string) => ROOM_TYPES.find((type) => type.value === value)?.label ?? value;
const floorLabel = (floor: ApartmentFloor) => `Floor ${floor.level}`;

const blankForm = {
  ownerEmail: '',
  propertyType: 'APARTMENT' as PropertyType,
  buildingName: '',
  address: '',
  tower: '',
  unitNo: '',
  floorNo: '',
  layoutCode: '',
  netArea: '',
  bedroomCount: '1',
  bathroomCount: '1',
};

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.code === 'NOT_APARTMENT_STAFF') return 'You can edit this property only while you are the staff member in charge of one of its projects.';
    if (error.code === 'APARTMENT_LOCKED') return 'This property is in the contract or design stage of a project and can no longer be changed.';
    if (error.code === 'APARTMENT_ALREADY_EXISTS') return 'This owner already has a property with the same building, block and unit number.';
    if (error.status === 0) return 'Could not connect to the server. Check your connection and try again.';
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to perform this action.';

    const details = [
      ...error.messages,
      ...Object.entries(error.fieldErrors).map(([field, message]) => `${field}: ${message}`),
    ].map((message) => message
      .replace(/\b(?:apartmentId|floorId|roomId|propertyId)\s*:\s*[^\s,;]+/gi, '')
      .replace(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,;])/g, '$1')
      .replace(/[\s.,;:]+$/g, '')
      .trim())
      .filter(Boolean);
    if (details.length > 0) return details.join(' ');
    if (error.status === 400 || error.status === 422) return `The request contains invalid data. Review the fields and try again. (HTTP ${error.status})`;
    if (error.status === 404) return 'The requested apartment data was not found. (HTTP 404)';
    if (error.status === 409) return 'This apartment conflicts with an existing record. Check the details and try again. (HTTP 409)';
    if (error.status >= 500) return `The server encountered an internal error. Please try again later. (HTTP ${error.status})`;
    return `The request failed. Please try again. (HTTP ${error.status || 'unknown'})`;
  }
  return fallback;
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false, min, max, step, hint, error, maxLength }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  error?: string;
  maxLength?: number;
}) {
  return <label className="block text-sm font-medium text-slate-700">
    {label}
    <input type={type} value={value} required={required} min={min} max={max} step={step} maxLength={maxLength} aria-invalid={error ? true : undefined} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
    {error ? <span role="alert" className="mt-1 block text-xs font-medium text-rose-600">{error}</span>
      : hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
  </label>;
}

export const ApartmentManagement: React.FC = () => {
  const user = getCurrentUser();
  const role: UserRole = user?.role ?? 'homeowner';
  const canSetOwner = role === 'staff' || role === 'admin';
  const canCreate = role === 'homeowner' || canSetOwner;
  const [items, setItems] = useState<Apartment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState<Apartment | null>(null);
  const [selected, setSelected] = useState<Apartment | null>(null);
  const [floors, setFloors] = useState<ApartmentFloor[]>([]);
  const [rooms, setRooms] = useState<ApartmentRoom[]>([]);
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(() => new Set());
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [roomForm, setRoomForm] = useState({ name: '', roomType: '', floorId: '', area: '', purpose: '' });
  // Once the user edits the room name by hand, picking another room type no longer overwrites it.
  const [roomNameTouched, setRoomNameTouched] = useState(false);

  /** Default name for a room type: "Bedroom", then "Bedroom 2", "Bedroom 3"... when the property already has that kind of room. */
  const suggestRoomName = (roomType: string) => {
    const label = roomTypeLabel(roomType);
    const pattern = new RegExp(`^${label.replace(/[.*+?^${}()|[]\]/g, '\$&')}(?: (\d+))?$`, 'i');
    const matches = rooms.map((room) => pattern.exec(room.name.trim())).filter((match): match is RegExpExecArray => match !== null);
    if (!matches.length) return label;
    const highest = Math.max(...matches.map((match) => (match[1] ? Number(match[1]) : 1)));
    return `${label} ${Math.max(highest, matches.length) + 1}`;
  };

  const [suggest, setSuggest] = useState<{ apartment: Apartment; rooms: { name: string; roomType: string; checked: boolean }[] } | null>(null);
  const [suggestSaving, setSuggestSaving] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  const isHouse = form.propertyType === 'HOUSE';
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const title = role === 'homeowner' ? 'My properties' : 'Apartments';

  const load = useCallback(async (targetPage: number, search: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await apartmentService.list({ q: search.trim() || undefined, page: targetPage, limit: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
      setPage(result.page);
    } catch (reason) {
      setItems([]);
      setTotal(0);
      setError(errorMessage(reason, 'Could not load apartments.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(1, ''); }, [load]);

  const updateForm = (key: keyof typeof blankForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => (current[key] || (key === 'address' && current.unitNo) ? { ...current, [key]: '', ...(key === 'address' ? { unitNo: '' } : {}) } : current));
  };
  const openCreate = () => {
    setEditing(null);
    setForm({ ...blankForm, ownerEmail: '' });
    setFormError('');
    setFieldErrors({});
    setModalOpen(true);
  };
  const openEdit = (apartment: Apartment) => {
    setEditing(apartment);
    setForm({
      ...blankForm,
      propertyType: apartment.propertyType,
      buildingName: apartment.buildingName,
      address: apartment.address,
      tower: apartment.tower ?? '',
      unitNo: apartment.unitNo,
      // The backend sends null for optional fields that were never filled in.
      floorNo: apartment.floorNo == null ? '' : String(apartment.floorNo),
      layoutCode: apartment.layoutCode ?? '',
      netArea: String(apartment.netArea),
      bedroomCount: String(apartment.bedroomCount),
      bathroomCount: String(apartment.bathroomCount),
    });
    setFormError('');
    setFieldErrors({});
    setModalOpen(true);
  };

  /** After a property is created, suggest its rooms (living room, bedrooms, kitchen, bathrooms) so the owner can add them in one go. */
  const offerRooms = (apartment: Apartment, bedrooms: number, bathrooms: number) => {
    const numbered = (base: string, roomType: string, count: number) =>
      Array.from({ length: Math.max(0, Math.min(count, 20)) }, (_, i) => ({ name: count > 1 ? `${base} ${i + 1}` : base, roomType, checked: true }));
    setSuggestError('');
    setSuggest({
      apartment,
      rooms: [
        { name: 'Living room', roomType: 'LIVING_ROOM', checked: true },
        { name: 'Kitchen', roomType: 'KITCHEN', checked: true },
        ...numbered('Bedroom', 'BEDROOM', bedrooms),
        ...numbered('Bathroom', 'BATHROOM', bathrooms),
      ],
    });
  };

  const submitSuggestedRooms = async () => {
    if (!suggest) return;
    setSuggestSaving(true);
    setSuggestError('');
    const chosen = suggest.rooms.filter((room) => room.checked);
    const added: typeof chosen = [];
    try {
      for (const room of chosen) {
        await apartmentService.createRoom(suggest.apartment.id, { name: room.name, roomType: room.roomType });
        added.push(room);
      }
      const apartment = suggest.apartment;
      setSuggest(null);
      if (added.length > 0) void openDetail(apartment);
    } catch (reason) {
      // keep only the rooms that were not created, so a retry does not duplicate them
      setSuggest((current) => (current ? { ...current, rooms: current.rooms.filter((room) => !added.includes(room)) } : current));
      setSuggestError(`${added.length} of ${chosen.length} rooms added. ${errorMessage(reason, 'Could not add the rooms. Try again from the property details.')}`);
    } finally {
      setSuggestSaving(false);
    }
  };

  /** A house has no separate unit field: reuse the stored unit when the address is untouched, else take the house number from the address. */
  const houseUnitNo = () => {
    const address = form.address.trim();
    if (editing && address === editing.address.trim() && editing.unitNo) return editing.unitNo;
    const first = address.split(/[s,]+/)[0] ?? '';
    return (/d/.test(first) ? first : address).slice(0, 50);
  };

  /** Same limits as the backend, so most mistakes show up before a request is sent. */
  const validateForm = () => {
    const errors: Record<string, string> = {};
    const required = 'This field is required.';
    const tooLong = (max: number) => `Use at most ${max} characters.`;
    const integerIn = (raw: string, min: number, max: number) => /^-?\d+$/.test(raw.trim()) && Number(raw) >= min && Number(raw) <= max;
    if (canSetOwner && !editing && !form.ownerEmail.trim()) errors.ownerEmail = required;
    if (!form.buildingName.trim()) errors.buildingName = required;
    else if (form.buildingName.trim().length > 200) errors.buildingName = tooLong(200);
    if (!form.address.trim()) errors.address = required;
    else if (form.address.trim().length > 500) errors.address = tooLong(500);
    if (!isHouse) {
      if (!form.unitNo.trim()) errors.unitNo = required;
      else if (form.unitNo.trim().length > 50) errors.unitNo = tooLong(50);
      if (form.tower.trim().length > 50) errors.tower = tooLong(50);
      if (form.layoutCode.trim().length > 50) errors.layoutCode = tooLong(50);
    }
    // Check for blank before Number(): Number('') is 0, which would quietly become "ground floor" or "0 m²".
    if (form.floorNo.trim() && !integerIn(form.floorNo, -10, 200)) errors.floorNo = 'Use a whole number from -10 to 200.';
    if (!form.netArea.trim()) errors.netArea = required;
    else if (!/^\d+(\.\d{1,2})?$/.test(form.netArea.trim()) || Number(form.netArea) <= 0 || Number(form.netArea) > 999999) errors.netArea = 'Use a number above 0 with at most 2 decimals (up to 999999).';
    if (!form.bedroomCount.trim()) errors.bedroomCount = required;
    else if (!integerIn(form.bedroomCount, 0, 20)) errors.bedroomCount = 'Use a whole number from 0 to 20.';
    if (!form.bathroomCount.trim()) errors.bathroomCount = required;
    else if (!integerIn(form.bathroomCount, 0, 20)) errors.bathroomCount = 'Use a whole number from 0 to 20.';
    return errors;
  };

  /** Put a backend error on the box that caused it; true when it found one. */
  const showApiFieldError = (reason: unknown) => {
    if (!(reason instanceof ApiError)) return false;
    if (reason.code === 'VALIDATION_ERROR') {
      const errors: Record<string, string> = {};
      for (const [field, message] of Object.entries(reason.fieldErrors)) errors[field.split('.').pop() ?? field] = message;
      setFieldErrors(errors);
      setFormError('Some fields need attention.');
      return Object.keys(errors).length > 0;
    }
    // The backend names no field for a duplicate: it is the building + block + unit combination.
    if (reason.code === 'APARTMENT_ALREADY_EXISTS') {
      setFieldErrors({ [isHouse ? 'address' : 'unitNo']: errorMessage(reason, '') });
      return true;
    }
    if (reason.code === 'USER_NOT_FOUND') { setFieldErrors({ ownerEmail: 'No homeowner account uses this email.' }); return true; }
    if (reason.code === 'USER_NOT_ACTIVE') { setFieldErrors({ ownerEmail: 'This homeowner account is not active yet.' }); return true; }
    return false;
  };

  const submitApartment = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    const problems = validateForm();
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;
    setSaving(true);
    try {
      // Everything that can throw is inside the try, so the Save button never stays stuck on "saving".
      const buildingName = form.buildingName.trim();
      const address = form.address.trim();
      const unitNo = isHouse ? houseUnitNo() : form.unitNo.trim();
      const netArea = Number(form.netArea); // the backend wants a number here although it answers with a string
      const bedroomCount = Number(form.bedroomCount);
      const bathroomCount = Number(form.bathroomCount);
      // Optional fields: a blank box is "no value". Tower and layout do not apply to a house.
      const tower = !isHouse && form.tower.trim() ? form.tower.trim() : null;
      const floorNo = form.floorNo.trim() ? Number(form.floorNo) : null;
      const layoutCode = !isHouse && form.layoutCode.trim() ? form.layoutCode.trim() : null;

      let created: Apartment | null = null;
      if (editing) {
        // PATCH: leave out what did not change, send null to clear tower / floorNo / layoutCode, never "".
        const changes: ApartmentPatch = {};
        if (form.propertyType !== editing.propertyType) changes.propertyType = form.propertyType;
        if (buildingName !== editing.buildingName) changes.buildingName = buildingName;
        if (address !== editing.address) changes.address = address;
        if (unitNo !== editing.unitNo) changes.unitNo = unitNo;
        if (netArea !== Number(editing.netArea)) changes.netArea = netArea;
        if (bedroomCount !== editing.bedroomCount) changes.bedroomCount = bedroomCount;
        if (bathroomCount !== editing.bathroomCount) changes.bathroomCount = bathroomCount;
        if (tower !== (editing.tower ?? null)) changes.tower = tower;
        if (floorNo !== (editing.floorNo ?? null)) changes.floorNo = floorNo;
        if (layoutCode !== (editing.layoutCode ?? null)) changes.layoutCode = layoutCode;
        if (Object.keys(changes).length > 0) await apartmentService.update(editing.id, changes);
      } else {
        // POST: blank optional fields are simply left out.
        const payload: ApartmentPayload = {
          propertyType: form.propertyType, buildingName, address, unitNo, netArea, bedroomCount, bathroomCount,
          ...(tower ? { tower } : {}),
          ...(floorNo !== null ? { floorNo } : {}),
          ...(layoutCode ? { layoutCode } : {}),
        };
        created = await apartmentService.create({ ...payload, ...(canSetOwner ? { ownerEmail: form.ownerEmail.trim() } : {}) });
      }
      setModalOpen(false);
      // Staff may add rooms only once in charge of a project of this property (the API answers 403 before that): only the owner is offered rooms.
      if (created && role !== 'staff') offerRooms(created, Number(form.bedroomCount), Number(form.bathroomCount));
      await load(page, query);
    } catch (reason) {
      if (!showApiFieldError(reason)) setFormError(errorMessage(reason, 'Could not save the apartment. Check the fields and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (apartment: Apartment) => {
    setSelected(apartment);
    setDetailLoading(true);
    setDetailError('');
    setFloors([]);
    setRooms([]);
    setExpandedFloors(new Set());
    try {
      const [detail, floorList, roomList] = await Promise.all([
        apartmentService.get(apartment.id),
        apartmentService.listFloors(apartment.id),
        apartmentService.listRooms(apartment.id),
      ]);
      setSelected(detail);
      setFloors(floorList);
      setRooms(roomList);
    } catch (reason) {
      setDetailError(errorMessage(reason, 'Could not load apartment details.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const submitRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setRoomSaving(true);
    setRoomError('');
    try {
      await apartmentService.createRoom(selected.id, {
        name: roomForm.name.trim(),
        roomType: roomForm.roomType,
        floorId: roomForm.floorId,
        area: Number(roomForm.area),
        purpose: roomForm.purpose.trim(),
      });
      const updatedRooms = await apartmentService.listRooms(selected.id);
      setRooms(updatedRooms);
      setRoomModalOpen(false);
      setRoomForm({ name: '', roomType: '', floorId: floors[0]?.id ?? '', area: '', purpose: '' });
    } catch (reason) {
      setRoomError(errorMessage(reason, 'Could not add the room. Check the fields and try again.'));
    } finally {
      setRoomSaving(false);
    }
  };

  // A house has Floor 1 only until the designer's first DXF upload adds the rest (no API creates floors), so levels
  // up to the entered floor count are listed but disabled: a room needs the id of a floor that exists.
  const floorOptions = useMemo(() => {
    const real = [...floors].sort((a, b) => a.level - b.level).map((floor) => ({ key: floor.id, label: floorLabel(floor), floorId: floor.id, available: true }));
    const declared = selected?.propertyType === 'HOUSE' ? Math.min(Number(selected.floorNo) || 0, 20) : 0;
    const have = new Set(floors.map((floor) => floor.level));
    const missing = Array.from({ length: declared }, (_, i) => i + 1).filter((level) => !have.has(level))
      .map((level) => ({ key: `level-${level}`, label: `Floor ${level} (not created yet)`, floorId: '', available: false }));
    return [...real, ...missing];
  }, [floors, selected]);

  const roomsByFloor = useMemo(() => new Map(floors.map((floor) => [floor.id, rooms.filter((room) => room.floorId === floor.id)])), [floors, rooms]);

  const searchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void load(1, query);
  };

  return <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
    <Header role={role} />
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Project setup</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">Apartment details, floors and rooms used to prepare a design project.</p>
        </div>
        {canCreate && <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"><Plus size={17}/> Add property</button>}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <form onSubmit={searchSubmit} className="mb-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative block flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search building, address or unit" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"/></label>
          <button disabled={loading} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Search</button>
        </form>
        {error && <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => void load(page, query)} className="shrink-0 font-semibold underline">Try again</button></div>}
        {loading ? <div className="grid min-h-52 place-items-center text-sm text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle size={17} className="animate-spin"/>Loading apartments…</span></div> : items.length ? <div className="grid gap-4 md:grid-cols-2">
          {items.map((apartment) => <article key={apartment.id} className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm">
            <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><Building2 size={21}/></span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{apartment.propertyType}</span></div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">{apartment.buildingName}</h2>
            <p className="mt-1 text-sm text-slate-500">{apartment.address}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><p><span className="block text-xs text-slate-400">Unit</span><b className="text-slate-700">{apartment.unitNo}</b></p><p><span className="block text-xs text-slate-400">Owner</span><b className="text-slate-700">{apartment.owner?.fullName ?? '—'}</b></p><p><span className="block text-xs text-slate-400">Area</span><b className="text-slate-700">{apartment.netArea} m²</b></p><p><span className="block text-xs text-slate-400">Bedrooms · bathrooms</span><b className="text-slate-700">{apartment.bedroomCount} · {apartment.bathroomCount}</b></p></div>
            <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => void openDetail(apartment)} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">View floors &amp; rooms</button><button type="button" onClick={() => openEdit(apartment)} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Edit details</button></div>
          </article>)}
        </div> : <div className="grid min-h-60 place-items-center text-center"><div><Building2 size={30} className="mx-auto text-slate-300"/><h2 className="mt-3 font-semibold text-slate-800">No properties found</h2><p className="mt-1 text-sm text-slate-500">Add a property to begin project setup.</p></div></div>}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500"><span>{total} properties</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => void load(page - 1, query)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40"><ChevronLeft size={15}/> Previous</button><span className="px-2 py-2">{page} / {pageCount}</span><button type="button" disabled={page >= pageCount || loading} onClick={() => void load(page + 1, query)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next <ChevronRight size={15}/></button></div></div>
      </section>
    </main>
    <Footer/>

    {modalOpen && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="apartment-form-title" className="my-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-5 flex items-start justify-between"><div><h2 id="apartment-form-title" className="text-xl font-bold text-slate-900">{editing ? 'Edit property' : 'Add property'}</h2><p className="mt-1 text-sm text-slate-500">Enter the property details used by the design team.</p></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20}/></button></div>
      {formError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</p>}
      <form onSubmit={submitApartment} className="space-y-4">
        {canSetOwner && !editing && <Field label="Homeowner email" value={form.ownerEmail} onChange={(value) => updateForm('ownerEmail', value)} placeholder="e.g. homeowner@example.com" type="email" required error={fieldErrors.ownerEmail}/>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Property type<select value={form.propertyType} onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value as PropertyType }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"><option value="APARTMENT">Apartment</option><option value="HOUSE">House</option></select></label><Field label={isHouse ? 'Area / Complex name' : 'Building / Project name'} value={form.buildingName} onChange={(value) => updateForm('buildingName', value)} placeholder="e.g. Sunrise City" required maxLength={200} error={fieldErrors.buildingName}/><Field label={isHouse ? 'Full address' : 'Address (Street, District, City)'} value={form.address} onChange={(value) => updateForm('address', value)} placeholder={isHouse ? 'e.g. 88 Street 18, Ward 5, District 10, Ho Chi Minh City' : 'Street, district, city'} hint={isHouse ? 'Include the house number; it is used as the unit number.' : undefined} required maxLength={500} error={fieldErrors.address}/>{!isHouse && <Field label="Tower / Block" value={form.tower} onChange={(value) => updateForm('tower', value)} placeholder="e.g. S1.02" maxLength={50} error={fieldErrors.tower}/>}{!isHouse && <Field label="Unit number" value={form.unitNo} onChange={(value) => updateForm('unitNo', value)} placeholder="e.g. S1.02-1205" required maxLength={50} error={fieldErrors.unitNo}/>}<Field label="Floor number" value={form.floorNo} onChange={(value) => updateForm('floorNo', value)} placeholder="e.g. 12" type="number" min={-10} max={200} error={fieldErrors.floorNo}/>{!isHouse && <Field label="Layout code / Design layout" value={form.layoutCode} onChange={(value) => updateForm('layoutCode', value)} placeholder="e.g. 2PN-A1" hint="Layout template code or name provided by developer (e.g. 2PN-A1). Optional." maxLength={50} error={fieldErrors.layoutCode}/>}<Field label="Net area (m²)" value={form.netArea} onChange={(value) => updateForm('netArea', value)} placeholder="e.g. 65.5" type="number" min={0.1} step={0.01} required error={fieldErrors.netArea}/><Field label="Bedrooms" value={form.bedroomCount} onChange={(value) => updateForm('bedroomCount', value)} placeholder="e.g. 2" type="number" min={0} max={20} required error={fieldErrors.bedroomCount}/><Field label="Bathrooms" value={form.bathroomCount} onChange={(value) => updateForm('bathroomCount', value)} placeholder="e.g. 2" type="number" min={0} max={20} required error={fieldErrors.bathroomCount}/></div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving && <LoaderCircle size={15} className="animate-spin"/>}{editing ? 'Save changes' : 'Create property'}</button></div>
      </form>
    </section></div>}

    {suggest && <div className="fixed inset-0 z-[85] grid place-items-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="suggest-rooms-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-2 flex items-start justify-between"><div><h3 id="suggest-rooms-title" className="text-xl font-bold text-slate-900">Add rooms to this property?</h3><p className="mt-1 text-sm text-slate-500">{suggest.apartment.buildingName} · {suggest.apartment.unitNo} was created. Tick the rooms to add now; you can add more later from the property details.</p></div><button type="button" onClick={() => setSuggest(null)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19}/></button></div>
      {suggestError && <p role="alert" className="my-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{suggestError}</p>}
      <ul className="my-4 grid gap-2 sm:grid-cols-2">{suggest.rooms.map((room, index) => <li key={`${room.roomType}-${room.name}`}><label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-700"><input type="checkbox" checked={room.checked} disabled={suggestSaving} onChange={(event) => setSuggest((current) => (current ? { ...current, rooms: current.rooms.map((item, i) => (i === index ? { ...item, checked: event.target.checked } : item)) } : current))} className="accent-blue-600"/>{room.name}</label></li>)}</ul>
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" disabled={suggestSaving} onClick={() => setSuggest(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Skip for now</button><button type="button" disabled={suggestSaving || !suggest.rooms.some((room) => room.checked)} onClick={() => void submitSuggestedRooms()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{suggestSaving && <LoaderCircle size={15} className="animate-spin"/>}Add selected rooms</button></div>
    </section></div>}

    {selected && <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><aside role="dialog" aria-modal="true" aria-labelledby="apartment-detail-title" className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-6 flex items-start justify-between"><div><p className="text-sm font-semibold text-blue-600">Property details</p><h2 id="apartment-detail-title" className="mt-1 text-2xl font-extrabold text-slate-900">{selected.buildingName} · {selected.unitNo}</h2><p className="mt-1 text-sm text-slate-500">{selected.address}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Close details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20}/></button></div>
      {detailError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{detailError}</p>}
      {detailLoading ? <div className="grid min-h-52 place-items-center text-slate-500"><LoaderCircle size={22} className="animate-spin"/></div> : <>
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm"><p><span className="block text-xs text-slate-400">Layout</span><b>{selected.layoutCode || '—'}</b></p><p><span className="block text-xs text-slate-400">Net area</span><b>{selected.netArea} m²</b></p><p><span className="block text-xs text-slate-400">Bedrooms</span><b>{selected.bedroomCount}</b></p><p><span className="block text-xs text-slate-400">Bathrooms</span><b>{selected.bathroomCount}</b></p></div>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Floors &amp; rooms</h3><button type="button" disabled={!floors.length} onClick={() => { setRoomError(''); setRoomNameTouched(false); setRoomForm({ name: '', roomType: '', floorId: floors[0]?.id ?? '', area: '', purpose: '' }); setRoomModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"><Plus size={15}/> Add room</button></div>
        {!floors.length ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No floors are listed for this property.</p> : <div className="space-y-3">{floors.map((floor) => {
          const floorRooms = roomsByFloor.get(floor.id) ?? [];
          const isExpanded = expandedFloors.has(floor.id);
          return <section key={floor.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button type="button" aria-expanded={isExpanded} onClick={() => setExpandedFloors((current) => {
              const next = new Set(current);
              if (next.has(floor.id)) next.delete(floor.id);
              else next.add(floor.id);
              return next;
            })} className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-slate-50">
              <span className="flex min-w-0 items-center gap-3"><ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/><span><b className="block text-sm font-bold text-slate-800">{floorLabel(floor)}</b><small className="mt-0.5 block text-xs text-slate-500">Level {floor.level}{floor.floorHeightMm ? ` · ${floor.floorHeightMm} mm height` : ''}</small></span></span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{floorRooms.length} {floorRooms.length === 1 ? 'room' : 'rooms'}</span>
            </button>
            {isExpanded && <div className="border-t border-slate-100 px-4 pb-2 pl-11">{floorRooms.length ? <ul className="divide-y divide-slate-100">{floorRooms.map((room) => <li key={room.id} className="flex items-start gap-3 py-3"><DoorOpen size={16} className="mt-0.5 shrink-0 text-slate-400"/><span className="min-w-0 flex-1"><b className="block text-sm text-slate-700">{room.name}</b><small className="text-slate-500">{roomTypeLabel(room.roomType)} · {room.area} m²{room.purpose ? ` · ${room.purpose}` : ''}</small></span></li>)}</ul> : <p className="py-4 text-sm text-slate-500">No rooms on this floor yet.</p>}</div>}
          </section>;
        })}</div>}
      </>}
    </aside></div>}

    {roomModalOpen && selected && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="room-form-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h3 id="room-form-title" className="text-xl font-bold text-slate-900">Add room</h3><button type="button" onClick={() => setRoomModalOpen(false)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19}/></button></div>{roomError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{roomError}</p>}<form onSubmit={submitRoom} className="space-y-4"><Field label="Room name" value={roomForm.name} onChange={(value) => { setRoomNameTouched(true); setRoomForm((current) => ({ ...current, name: value })); }} placeholder="e.g. Living room" hint="Custom display name (e.g. Master Bedroom, Kids Room)" required/><label className="block text-sm font-medium text-slate-700">Floor<select required value={roomForm.floorId} onChange={(event) => setRoomForm((current) => ({ ...current, floorId: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">{floorOptions.map((option) => <option key={option.key} value={option.floorId} disabled={!option.available}>{option.label}</option>)}</select></label>{floorOptions.some((option) => !option.available) && <p className="-mt-2 text-xs text-slate-500">Floors marked "not created yet" are added when the designer uploads the first DXF for them.</p>}<label className="block text-sm font-medium text-slate-700">Room type<select required value={roomForm.roomType} onChange={(event) => { const roomType = event.target.value; setRoomForm((current) => ({ ...current, roomType, name: roomNameTouched && current.name.trim() ? current.name : suggestRoomName(roomType) })); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"><option value="" disabled>Select a room type</option>{ROOM_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label><Field label="Area (m²)" value={roomForm.area} onChange={(value) => setRoomForm((current) => ({ ...current, area: value }))} placeholder="e.g. 24.5" type="number" min={0.1} step={0.1} required/><Field label="Purpose" value={roomForm.purpose} onChange={(value) => setRoomForm((current) => ({ ...current, purpose: value }))} placeholder="e.g. Family gathering and entertaining"/><div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => setRoomModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={roomSaving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{roomSaving ? 'Saving…' : 'Add room'}</button></div></form></section></div>}
  </div>;
};
