import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import AdvisorDashboard from '@/components/dashboards/AdvisorDashboard';

const Students = () => {
  const { role } = useAuth();

  return (
    <AppLayout>
      {(role === 'advisor' || role === 'dil_admin') ? (
        <AdvisorDashboard />
      ) : (
        <div className="text-center py-12 text-muted-foreground">You don't have access to this page.</div>
      )}
    </AppLayout>
  );
};

export default Students;
