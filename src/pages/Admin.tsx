import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

const Admin = () => {
  const { role } = useAuth();

  return (
    <AppLayout>
      {role === 'dil_admin' ? (
        <AdminDashboard />
      ) : (
        <div className="text-center py-12 text-muted-foreground">You don't have access to this page.</div>
      )}
    </AppLayout>
  );
};

export default Admin;
