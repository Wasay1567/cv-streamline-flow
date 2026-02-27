import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import StudentDashboard from '@/components/dashboards/StudentDashboard';
import AdvisorDashboard from '@/components/dashboards/AdvisorDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

const Dashboard = () => {
  const { role } = useAuth();

  return (
    <AppLayout>
      {role === 'student' && <StudentDashboard />}
      {role === 'advisor' && <AdvisorDashboard />}
      {role === 'dil_admin' && <AdminDashboard />}
      {!role && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
