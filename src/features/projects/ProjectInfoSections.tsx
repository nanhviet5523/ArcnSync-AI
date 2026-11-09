import { Card, DetailList, initials } from '@/components/ui';
import { formatMoney, formatNumber, t } from '@/i18n';
import type { Person, Project } from './projectApi';
import { unitLabel } from './projectView';

/** Home, People and Budget blocks of a project, shared by the homeowner overview and the workspace "Project info" drawer. */

export function HomeCard({ project, className = '' }: { project: Project; className?: string }) {
  const a = project.apartment;
  const floors = [...(a.floors ?? [])].sort((x, y) => x.level - y.level);
  // only counts the backend actually has; never an invented 0
  const rooms = [a.bedroomCount != null && t('homeownerDetail.bedrooms', { n: a.bedroomCount }), a.bathroomCount != null && t('homeownerDetail.bathrooms', { n: a.bathroomCount })].filter(Boolean).join(', ');
  return (
    <Card title={t('projectDetail.home')} className={className}>
      <DetailList items={[
        // a missing value drops its row instead of showing a placeholder
        ...(a.propertyType ? [{ label: t('projectDetail.type'), value: t(`projectDetail.propertyType.${a.propertyType}`) }] : []),
        { label: t('projectDetail.address'), value: a.address },
        { label: t('projectDetail.unit'), value: unitLabel(a) },
        ...(a.netArea ? [
          { label: t('projectDetail.area'), value: t('projectDetail.areaValue', { area: formatNumber(a.netArea) }) },
        ] : []),
        ...(rooms ? [{ label: t('projectDetail.rooms'), value: rooms }] : []),
      ]} />
      <div className="mt-5 border-t border-line pt-4">
        <h3 className="mb-2 text-[13px] font-medium text-slate-700">{t('projectDetail.floors')}</h3>
        {floors.length ? (
          <ul className="flex flex-wrap gap-2">
            {floors.map((f) => (
              <li key={f.id} className="rounded-full border border-line bg-slate-50 px-3 py-1 text-[13px] text-slate-700">
                {t('homeownerDetail.floorChip', { name: f.name, h: (Math.round(f.floorHeightMm / 100) / 10).toLocaleString('en-US') })}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-500">{t('projectDetail.noFloors')}</p>}
      </div>
    </Card>
  );
}

function PersonRow({ person, role }: { person: Person | null; role: string }) {
  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${person ? 'bg-navy text-white' : 'border border-dashed border-line-strong text-slate-500'}`}>
        {person ? initials(person.fullName) : '?'}
      </span>
      <div className="min-w-0">
        <p className={`truncate text-sm font-semibold ${person ? 'text-slate-900' : 'text-slate-500'}`}>{person?.fullName ?? t('projectDetail.notAssigned')}</p>
        <p className="text-xs text-slate-500">{role}</p>
      </div>
    </li>
  );
}

export function PeopleCard({ project }: { project: Project }) {
  return (
    <Card title={t('homeownerDetail.people')}>
      <ul className="divide-y divide-slate-100">
        <PersonRow person={project.designer} role={t('role.designer')} />
        <PersonRow person={project.staff} role={t('homeownerDetail.coordinator')} />
      </ul>
    </Card>
  );
}

export function BudgetCard({ project }: { project: Project }) {
  return (
    <Card title={t('projectDetail.budget')}>
      <p className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">
        {t('projectDetail.budgetValue', { min: formatMoney(project.budgetMin), max: formatMoney(project.budgetMax) })}
      </p>
    </Card>
  );
}
