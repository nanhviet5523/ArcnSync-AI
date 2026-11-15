import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronLeft, ChevronRight, DoorOpen, LoaderCircle, Plus, Search, X } from 'lucide-react';
import { Footer, Header } from '@/components/layout';
import { ApiError, getCurrentUser } from '@/services/authService';
import { apartmentService, type Apartment, type ApartmentFloor, type ApartmentPayload, type ApartmentRoom, type PropertyType } from '@/services/apartmentService';
import type { UserRole } from '@/types/role';

const PAGE_SIZE = 20;

const blankForm = {
  ownerEmail: '',
  propertyType: 'APARTMENT' as PropertyType,
  buildingName: '',
  address: '',
  tower: '',
  unitNo: '',
  floorNo: '1',
  layoutCode: '',
  netArea: '',
  bedroomCount: '1',
  bathroomCount: '1',
};

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
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

function normalizeRoomType(value: string): string {
  const normalized = value.trim()
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();

  const commonAliases: Record<string, string> = {
    LIVINGROOM: 'LIVING_ROOM',
    DININGROOM: 'DINING_ROOM',
    BEDROOM: 'BEDROOM',
    BATHROOM: 'BATHROOM',
  };

  return commonAliases[normalized] ?? normalized;
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false, min, step }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  min?: number;
  step?: number;
}) {
  return <label className="block text-sm font-medium text-slate-700">
    {label}
    <input type={type} value={value} required={required} min={min} step={step} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
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

  const updateForm = (key: keyof typeof blankForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const openCreate = () => {
    setEditing(null);
    setForm({ ...blankForm, ownerEmail: '' });
    setFormError('');
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
      floorNo: String(apartment.floorNo),
      layoutCode: apartment.layoutCode,
      netArea: String(apartment.netArea),
      bedroomCount: String(apartment.bedroomCount),
      bathroomCount: String(apartment.bathroomCount),
    });
    setFormError('');
    setModalOpen(true);
  };

  const submitApartment = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    const payload: ApartmentPayload = {
      propertyType: form.propertyType,
      buildingName: form.buildingName.trim(),
      address: form.address.trim(),
      tower: form.tower.trim(),
      unitNo: form.unitNo.trim(),
      floorNo: Number(form.floorNo),
      layoutCode: form.layoutCode.trim(),
      netArea: Number(form.netArea),
      bedroomCount: Number(form.bedroomCount),
      bathroomCount: Number(form.bathroomCount),
    };
    try {
      if (editing) {
        await apartmentService.update(editing.id, payload);
      } else {
        await apartmentService.create({ ...payload, ...(canSetOwner ? { ownerEmail: form.ownerEmail.trim() } : {}) });
      }
      setModalOpen(false);
      await load(page, query);
    } catch (reason) {
      setFormError(errorMessage(reason, 'Could not save the apartment. Check the fields and try again.'));
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
        roomType: normalizeRoomType(roomForm.roomType),
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
        {canSetOwner && !editing && <Field label="Homeowner email" value={form.ownerEmail} onChange={(value) => updateForm('ownerEmail', value)} placeholder="e.g. homeowner@example.com" type="email" required/>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Property type<select value={form.propertyType} onChange={(event) => setForm((current) => ({ ...current, propertyType: event.target.value as PropertyType }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"><option value="APARTMENT">Apartment</option><option value="HOUSE">House</option></select></label><Field label="Building name" value={form.buildingName} onChange={(value) => updateForm('buildingName', value)} placeholder="e.g. Sunrise City" required/><Field label="Address" value={form.address} onChange={(value) => updateForm('address', value)} placeholder="Street, district, city" required/><Field label="Tower / block" value={form.tower} onChange={(value) => updateForm('tower', value)} placeholder="e.g. S1.02"/><Field label="Unit number" value={form.unitNo} onChange={(value) => updateForm('unitNo', value)} placeholder="e.g. S1.02-1205" required/><Field label="Floor number" value={form.floorNo} onChange={(value) => updateForm('floorNo', value)} placeholder="e.g. 12" type="number" min={0} required/><Field label="Layout code" value={form.layoutCode} onChange={(value) => updateForm('layoutCode', value)} placeholder="e.g. 2PN-A1" required/><Field label="Net area (m²)" value={form.netArea} onChange={(value) => updateForm('netArea', value)} placeholder="e.g. 65.5" type="number" min={0.1} step={0.1} required/><Field label="Bedrooms" value={form.bedroomCount} onChange={(value) => updateForm('bedroomCount', value)} placeholder="e.g. 2" type="number" min={0} required/><Field label="Bathrooms" value={form.bathroomCount} onChange={(value) => updateForm('bathroomCount', value)} placeholder="e.g. 2" type="number" min={0} required/></div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving && <LoaderCircle size={15} className="animate-spin"/>}{editing ? 'Save changes' : 'Create property'}</button></div>
      </form>
    </section></div>}

    {selected && <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><aside role="dialog" aria-modal="true" aria-labelledby="apartment-detail-title" className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-6 flex items-start justify-between"><div><p className="text-sm font-semibold text-blue-600">Property details</p><h2 id="apartment-detail-title" className="mt-1 text-2xl font-extrabold text-slate-900">{selected.buildingName} · {selected.unitNo}</h2><p className="mt-1 text-sm text-slate-500">{selected.address}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Close details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20}/></button></div>
      {detailError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{detailError}</p>}
      {detailLoading ? <div className="grid min-h-52 place-items-center text-slate-500"><LoaderCircle size={22} className="animate-spin"/></div> : <>
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm"><p><span className="block text-xs text-slate-400">Layout</span><b>{selected.layoutCode || '—'}</b></p><p><span className="block text-xs text-slate-400">Net area</span><b>{selected.netArea} m²</b></p><p><span className="block text-xs text-slate-400">Bedrooms</span><b>{selected.bedroomCount}</b></p><p><span className="block text-xs text-slate-400">Bathrooms</span><b>{selected.bathroomCount}</b></p></div>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">Floors &amp; rooms</h3><button type="button" disabled={!floors.length} onClick={() => { setRoomError(''); setRoomForm({ name: '', roomType: '', floorId: floors[0]?.id ?? '', area: '', purpose: '' }); setRoomModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"><Plus size={15}/> Add room</button></div>
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
              <span className="flex min-w-0 items-center gap-3"><ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/><span><b className="block text-sm font-bold text-slate-800">{floor.name || `Floor ${floor.level}`}</b><small className="mt-0.5 block text-xs text-slate-500">Level {floor.level}{floor.floorHeightMm ? ` · ${floor.floorHeightMm} mm height` : ''}</small></span></span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{floorRooms.length} {floorRooms.length === 1 ? 'room' : 'rooms'}</span>
            </button>
            {isExpanded && <div className="border-t border-slate-100 px-4 pb-2 pl-11">{floorRooms.length ? <ul className="divide-y divide-slate-100">{floorRooms.map((room) => <li key={room.id} className="flex items-start gap-3 py-3"><DoorOpen size={16} className="mt-0.5 shrink-0 text-slate-400"/><span className="min-w-0 flex-1"><b className="block text-sm text-slate-700">{room.name}</b><small className="text-slate-500">{room.roomType} · {room.area} m²{room.purpose ? ` · ${room.purpose}` : ''}</small></span></li>)}</ul> : <p className="py-4 text-sm text-slate-500">No rooms on this floor yet.</p>}</div>}
          </section>;
        })}</div>}
      </>}
    </aside></div>}

    {roomModalOpen && selected && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="room-form-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h3 id="room-form-title" className="text-xl font-bold text-slate-900">Add room</h3><button type="button" onClick={() => setRoomModalOpen(false)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={19}/></button></div>{roomError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{roomError}</p>}<form onSubmit={submitRoom} className="space-y-4"><Field label="Room name" value={roomForm.name} onChange={(value) => setRoomForm((current) => ({ ...current, name: value }))} placeholder="e.g. Living room" required/><label className="block text-sm font-medium text-slate-700">Floor<select required value={roomForm.floorId} onChange={(event) => setRoomForm((current) => ({ ...current, floorId: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm">{floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name || `Floor ${floor.level}`}</option>)}</select></label><Field label="Room type" value={roomForm.roomType} onChange={(value) => setRoomForm((current) => ({ ...current, roomType: value }))} placeholder="e.g. LIVING_ROOM" required/><Field label="Area (m²)" value={roomForm.area} onChange={(value) => setRoomForm((current) => ({ ...current, area: value }))} placeholder="e.g. 24.5" type="number" min={0.1} step={0.1} required/><Field label="Purpose" value={roomForm.purpose} onChange={(value) => setRoomForm((current) => ({ ...current, purpose: value }))} placeholder="e.g. Family gathering and entertaining"/><div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => setRoomModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={roomSaving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{roomSaving ? 'Saving…' : 'Add room'}</button></div></form></section></div>}
  </div>;
};
