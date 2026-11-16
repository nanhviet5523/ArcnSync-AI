import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { t } from '@/i18n';

/** A designer taken off the team opens the project: the backend answers 404. */
export function NotOnTeam() {
  const navigate = useNavigate();
  return (
    <Card className="mx-auto mt-10 w-full max-w-lg" bodyClassName="px-6 py-8 text-center">
      <h1 className="text-[15px] font-semibold text-slate-900">{t('team.notOnTeamTitle')}</h1>
      <p className="mt-1.5 text-sm text-slate-600">{t('team.notOnTeamBody')}</p>
      <Button variant="primary" className="mt-5" onClick={() => navigate('/designer/projects')}>{t('team.backToProjects')}</Button>
    </Card>
  );
}
