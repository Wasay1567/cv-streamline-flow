import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import StudentDashboard from '@/components/dashboards/StudentDashboard';
import AdvisorDashboard from '@/components/dashboards/AdvisorDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

const Dashboard = () => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {role === 'student' && <StudentDashboard />}
      {role === 'advisor' && <AdvisorDashboard />}
      {role === 'dil_admin' && <AdminDashboard />}
      {!role && (
        <div className="text-center py-12 space-y-2">
          <p className="text-muted-foreground font-medium">Your account is pending approval</p>
          <p className="text-sm text-muted-foreground">The DIL admin will approve your account shortly. Please check back later.</p>
        </div>
      )}
    </AppLayout>
  );
};

export default Dashboard;
