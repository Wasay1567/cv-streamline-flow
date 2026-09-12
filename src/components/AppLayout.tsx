import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, FileText, Users, LayoutDashboard, Shield, Clock } from 'lucide-react';
import { formatRemainingTime, useDeadline } from '@/hooks/use-deadline';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const { deadline, remainingMs } = useDeadline();

  const navItems = [
    { to: '/home', label: 'Home', icon: LayoutDashboard, roles: ['student', 'advisor', 'dil_admin'] },
    { to: '/cv-form', label: 'CV Form', icon: FileText, roles: ['student'] },
    { to: '/students', label: 'Students', icon: Users, roles: ['advisor', 'dil_admin'] },
    { to: '/admin', label: 'Admin', icon: Shield, roles: ['dil_admin'] },
  ];

  const filtered = navItems.filter((item) => {
    if (!role || !item.roles.includes(role)) return false;
    if (role === 'dil_admin' && (item.to === '/students' || item.to === '/admin')) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/home" className="flex items-center gap-2 font-bold text-primary text-lg">
              <FileText className="h-5 w-5" />
              Digital CV Repository Portal
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {filtered.map(item => (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant={location.pathname === item.to ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-6">
        {deadline && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">CV submission deadline</span>
            </div>
            <div className="text-sm">
              <span className="font-mono font-semibold">{formatRemainingTime(remainingMs)}</span>
              <span className="ml-2 text-amber-800">({new Date(deadline).toLocaleString()})</span>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
