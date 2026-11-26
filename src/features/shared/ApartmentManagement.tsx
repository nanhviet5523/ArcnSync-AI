import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, ChevronDown, ChevronLeft, ChevronRight, DoorOpen, LoaderCircle, Search, X } from 'lucide-react';
import { Footer, Header } from '@/components/layout';
import { ApiError, getCurrentUser } from '@/services/authService';
import { apartmentService, type Apartment, type ApartmentFloor, type ApartmentRoom } from '@/services/apartmentService';
import { roomTypeLabel } from '@/features/site-surveys/roomTypes';
import type { UserRole } from '@/types/role';

const PAGE_SIZE = 20;

const floorLabel = (floor: ApartmentFloor) => floor.name || `Floor ${floor.level}`;

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Could not connect to the server. Check your connection and try again.';
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission to view this property.';
    if (error.status === 404) return 'This property could not be found. It may have been removed.';
    if (error.status >= 500) return `The server encountered an internal error. Please try again later. (HTTP ${error.status})`;
    return `The request failed. Please try again. (HTTP ${error.status || 'unknown'})`;
  }
  return fallback;
}

/**
 * Apartments, read only (/homeowner-apartments, /staff-apartments, /admin-apartments).
 * Nobody creates or edits a property here: the apartment, its floors and rooms are created when the homeowner
 * confirms the Lead designer's site survey on the project page.
 */
export const ApartmentManagement: React.FC = () => {
  const user = getCurrentUser();
  const role: UserRole = user?.role ?? 'homeowner';
  const [items, setItems] = useState<Apartment[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Apartment | null>(null);
  const [floors, setFloors] = useState<ApartmentFloor[]>([]);
  const [rooms, setRooms] = useState<ApartmentRoom[]>([]);
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(() => new Set());
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

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
      setSearched(search.trim());
    } catch (reason) {
      setItems([]);
      setTotal(0);
      setError(errorMessage(reason, 'Could not load apartments.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { Promise.resolve().then(() => load(1, '')); }, [load]);

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
      setFloors([...floorList].sort((a, b) => a.level - b.level));
      setRooms(roomList);
    } catch (reason) {
      setDetailError(errorMessage(reason, 'Could not load apartment details.'));
    } finally {
      setDetailLoading(false);
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
      <div className="mb-8">
        <p className="text-sm font-semibold text-brand-text">Project setup</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Homes with their floors and rooms, as measured in the confirmed site survey of each project.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <form onSubmit={searchSubmit} className="mb-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative block flex-1"><span className="sr-only">Search properties</span><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search building, address or unit" className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"/></label>
          <button disabled={loading} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">Search</button>
        </form>
        {error && <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => void load(page, query)} className="shrink-0 font-semibold underline">Try again</button></div>}
        {loading ? <div className="grid min-h-52 place-items-center text-sm text-slate-500"><span className="inline-flex items-center gap-2"><LoaderCircle size={17} className="animate-spin"/>Loading apartments…</span></div> : items.length ? <div className="grid gap-4 md:grid-cols-2">
          {items.map((apartment) => <article key={apartment.id} className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-sm">
            <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-brand-text"><Building2 size={21}/></span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{apartment.propertyType === 'HOUSE' ? 'House' : 'Apartment'}</span></div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">{apartment.buildingName}</h2>
            <p className="mt-1 text-sm text-slate-500">{apartment.address}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><p><span className="block text-xs text-slate-400">Unit</span><b className="text-slate-700">{[apartment.tower, apartment.unitNo].filter(Boolean).join(' · ')}</b></p><p><span className="block text-xs text-slate-400">Owner</span><b className="text-slate-700">{apartment.owner?.fullName ?? '—'}</b></p><p><span className="block text-xs text-slate-400">Area</span><b className="text-slate-700">{apartment.netArea} m²</b></p><p><span className="block text-xs text-slate-400">Bedrooms · bathrooms</span><b className="text-slate-700">{apartment.bedroomCount} · {apartment.bathroomCount}</b></p></div>
            <div className="mt-5 border-t border-slate-100 pt-4"><button type="button" onClick={() => void openDetail(apartment)} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-brand-text hover:bg-blue-100">View floors &amp; rooms</button></div>
          </article>)}
        </div> : <div className="grid min-h-60 place-items-center text-center"><div className="max-w-md"><Building2 size={30} className="mx-auto text-slate-300"/>
          <h2 className="mt-3 font-semibold text-slate-800">{searched ? 'No properties match your search' : 'No properties yet'}</h2>
          <p className="mt-1 text-sm text-slate-500">{searched ? 'Try another building, address or unit number.' : "A home is created when the homeowner confirms the designer's site survey on the project page."}</p>
        </div></div>}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm text-slate-500"><span>{total} properties</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => void load(page - 1, query)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40"><ChevronLeft size={15}/> Previous</button><span className="px-2 py-2">{page} / {pageCount}</span><button type="button" disabled={page >= pageCount || loading} onClick={() => void load(page + 1, query)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next <ChevronRight size={15}/></button></div></div>
      </section>
    </main>
    <Footer/>

    {selected && <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><aside role="dialog" aria-modal="true" aria-labelledby="apartment-detail-title" className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-6 flex items-start justify-between"><div><p className="text-sm font-semibold text-brand-text">Property details</p><h2 id="apartment-detail-title" className="mt-1 text-2xl font-extrabold text-slate-900">{selected.buildingName} · {selected.unitNo}</h2><p className="mt-1 text-sm text-slate-500">{selected.address}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Close details" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20}/></button></div>
      {detailError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{detailError}</p>}
      {detailLoading ? <div className="grid min-h-52 place-items-center text-slate-500"><LoaderCircle size={22} className="animate-spin"/></div> : <>
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm"><p><span className="block text-xs text-slate-400">Layout</span><b>{selected.layoutCode || '—'}</b></p><p><span className="block text-xs text-slate-400">Net area</span><b>{selected.netArea} m²</b></p><p><span className="block text-xs text-slate-400">Bedrooms</span><b>{selected.bedroomCount}</b></p><p><span className="block text-xs text-slate-400">Bathrooms</span><b>{selected.bathroomCount}</b></p></div>
        <h3 className="mb-4 text-lg font-bold text-slate-900">Floors &amp; rooms</h3>
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
            {isExpanded && <div className="border-t border-slate-100 px-4 pb-2 pl-11">{floorRooms.length ? <ul className="divide-y divide-slate-100">{floorRooms.map((room) => <li key={room.id} className="flex items-start gap-3 py-3"><DoorOpen size={16} className="mt-0.5 shrink-0 text-slate-400"/><span className="min-w-0 flex-1"><b className="block text-sm text-slate-700">{room.name}</b><small className="text-slate-500">{[roomTypeLabel(room.roomType), room.area ? `${room.area} m²` : null, room.purpose].filter(Boolean).join(' · ')}</small></span></li>)}</ul> : <p className="py-4 text-sm text-slate-500">No rooms on this floor.</p>}</div>}
          </section>;
        })}</div>}
      </>}
    </aside></div>}
  </div>;
};
