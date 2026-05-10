import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Settings, MapPin, Phone, Mail, Globe, Handshake, MailCheck, FlaskConical, Target, GraduationCap } from 'lucide-react';

const dashboardConfig = {
  student: {
    title: 'Student Dashboard',
    description: 'Manage your CV submissions and track approval status',
    icon: FileText,
    color: 'bg-blue-50 border-blue-200',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
  },
  advisor: {
    title: 'Advisor Dashboard',
    description: 'Review and approve student CVs from your department',
    icon: Users,
    color: 'bg-green-50 border-green-200',
    buttonColor: 'bg-green-600 hover:bg-green-700',
  },
  dil_admin: {
    title: 'Admin Dashboard',
    description: 'Manage system settings, users, and view analytics',
    icon: Settings,
    color: 'bg-purple-50 border-purple-200',
    buttonColor: 'bg-purple-600 hover:bg-purple-700',
  },
};

export default function Home() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" />
      </div>
    );
  }

  const dashboard =
    role && role in dashboardConfig
      ? dashboardConfig[role as keyof typeof dashboardConfig]
      : null;

  const IconComponent = dashboard?.icon || FileText;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      
      {/* 1. EDGE-TO-EDGE BANNER */}
      <header className="w-full bg-white shadow-md mb-12">
        <img 
          src="/branding/banner.jpg" 
          alt="DIL Banner" 
          className="w-full h-auto max-h-[350px] object-cover"
        />
      </header>

      <div className="container mx-auto px-4 md:px-6 lg:px-8 pb-16">
        
        {/* 2. USER WELCOME & DASHBOARD ACTION (MOVED TO TOP) */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1e2a5e] mb-2">
              Welcome back, {user?.firstName || 'User'}!
            </h1>
            <p className="text-slate-500 mb-4">{user?.email}</p>
            {role && (
              <Badge className="bg-[#1e2a5e] hover:bg-blue-900 text-white text-sm px-6 py-1.5 capitalize rounded-full">
                {role === 'dil_admin' ? 'DIL Admin' : role}
              </Badge>
            )}
          </div>

          <div className="max-w-2xl mx-auto">
            {dashboard ? (
              <Card className={`border-2 ${dashboard.color} shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl bg-white`}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold mb-2 text-slate-800">
                        {dashboard.title}
                      </CardTitle>
                      <CardDescription className="text-base text-slate-600">
                        {dashboard.description}
                      </CardDescription>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                      <IconComponent className="w-8 h-8 text-[#1e2a5e]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => navigate(`/dashboard/${role === 'dil_admin' ? 'admin' : role}`)}
                    className={`w-full py-6 text-lg ${dashboard.buttonColor} text-white font-semibold rounded-lg shadow-md`}
                  >
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-amber-200 bg-amber-50 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl text-amber-900 flex items-center gap-2">
                    <MailCheck className="w-6 h-6" />
                    Account Setup Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-amber-800">
                    Your account is awaiting role assignment. Please contact your administrator.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* 3. PORTAL INTRODUCTION */}
        <section className="max-w-4xl mx-auto mb-12 text-center">
          <div className="inline-flex items-center justify-center p-4 bg-blue-100 text-[#1e2a5e] rounded-full mb-6">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#1e2a5e] mb-8 leading-tight tracking-wide">
            Welcome to <br className="md:hidden" /> "Digital CV Repository Portal"
          </h2>
          <div className="space-y-6 text-lg text-slate-700 leading-relaxed font-medium">
            <p>
              This portal serves as a centralized platform for collecting and showcasing the CVs of graduating students. It facilitates the creation of comprehensive graduate directories and enables seamless sharing with industry partners for job placement opportunities.
            </p>
            <p>
              By bridging the gap between academia and industry, the portal aims to strengthen collaboration, enhance employability, and support the professional growth of future graduates.
            </p>
          </div>
        </section>

        {/* 4. COLORED SLOGAN PICTURE/BANNER */}
        <section className="mb-20 max-w-5xl mx-auto">
          {/* If you have an actual image for the slogan, you can uncomment this img tag and delete the div below */}
          {/* <img src="/branding/slogan.png" alt="Collaborate, Innovate, Transform" className="w-full h-auto rounded-2xl shadow-xl" /> */}
          
          <div className="bg-gradient-to-br from-[#1e2a5e] via-blue-900 to-[#121a3f] text-white p-10 md:p-14 rounded-2xl shadow-2xl border-b-8 border-yellow-500 text-center relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10">
              <Target className="w-64 h-64" />
            </div>
            
            <div className="relative z-10">
              <h3 className="text-3xl md:text-5xl font-black uppercase tracking-widest mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">
                Collaborate, Innovate, Transform
              </h3>
              <p className="text-xl md:text-2xl font-semibold tracking-wide text-blue-100 uppercase">
                Academia - Industry - Government Partnerships!
              </p>
            </div>
          </div>
        </section>

        {/* 5. HERO GRID (Photos & Contact Info) */}
        <section className="mb-20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Images (Takes up 8 columns) */}
          <div className="lg:col-span-8 flex flex-col md:flex-row gap-6">
            <img
              src="/branding/DIL-building.jpg"
              alt="DIL Building Exterior"
              className="w-full md:w-1/2 object-cover rounded-xl shadow-lg border border-slate-200 min-h-[300px]"
            />
            <div className="w-full md:w-1/2 flex flex-col gap-6">
              <Card className="border border-slate-200 bg-white shadow-lg flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-bold uppercase tracking-wider text-[#1e2a5e] leading-tight">
                    Visualize Your Career Path
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    A key event aimed at bridging the gap between students and potential employers, providing a platform for graduating students to meet with employers, explore career opportunities, and secure positions in various industries.
                  </p>
                </CardContent>
              </Card>
              <img
                src="/branding/DIL-offices.jpg"
                alt="DIL Office Interior"
                className="w-full h-48 object-cover rounded-xl shadow-lg border border-slate-200"
              />
            </div>
          </div>

          {/* Right Side: Contact Card (Takes up 4 columns) */}
          <div className="lg:col-span-4">
            <Card className="border border-slate-200 bg-white shadow-xl h-full">
              <CardHeader className="bg-[#1e2a5e] rounded-t-lg pb-4 pt-6">
                <CardTitle className="text-xl font-bold uppercase tracking-wide text-center text-white">
                  Get In Touch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 text-slate-700">
                <div className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 text-[#1e2a5e] mt-0.5 flex-shrink-0" />
                  <p className="text-sm leading-relaxed">
                    DIL Office, 1st Floor, ADMIN BLOCK, NED UET, University Rd, Karachi.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Phone className="h-5 w-5 text-[#1e2a5e] flex-shrink-0" />
                  <p className="text-sm">
                    +92 (21) 99261261 - 8<br/>
                    <span className="text-xs text-slate-500">(Ext. 2274, 2218)</span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Globe className="h-5 w-5 text-[#1e2a5e] flex-shrink-0" />
                  <a href="https://www.neduet.edu.pk/DIL" target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                    neduet.edu.pk/DIL
                  </a>
                </div>
                <div className="flex items-center gap-4">
                  <Mail className="h-5 w-5 text-[#1e2a5e] flex-shrink-0" />
                  <a href="mailto:dil@neduet.edu.pk" className="text-sm text-blue-600 hover:underline">
                    dil@neduet.edu.pk
                  </a>
                </div>
                
                <div className="pt-6 mt-2 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Follow Us</p>
                  <div className="grid grid-cols-2 gap-2 text-sm font-medium text-slate-600">
                    <span className="hover:text-[#1e2a5e] cursor-pointer">@NED_UET</span>
                    <span className="hover:text-[#1e2a5e] cursor-pointer">@dil.neduet</span>
                    <span className="hover:text-[#1e2a5e] cursor-pointer">NED DIL</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 6. PARTNERSHIP ICONS */}
        <section className="mb-20 max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest">
            Driving The Future Through
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-12 sm:gap-24 text-[#1e2a5e]">
            <div className="flex flex-col items-center gap-4 transition-transform hover:scale-105">
              <div className="p-4 bg-blue-50 rounded-full">
                <Handshake className="h-8 w-8" />
              </div>
              <p className="font-bold tracking-wide">Collaborate</p>
            </div>
            <div className="flex flex-col items-center gap-4 transition-transform hover:scale-105">
              <div className="p-4 bg-blue-50 rounded-full">
                <FlaskConical className="h-8 w-8" />
              </div>
              <p className="font-bold tracking-wide">Innovate</p>
            </div>
            <div className="flex flex-col items-center gap-4 transition-transform hover:scale-105">
              <div className="p-4 bg-blue-50 rounded-full">
                <Target className="h-8 w-8" />
              </div>
              <p className="font-bold tracking-wide">Transform</p>
            </div>
          </div>
        </section>

        {/* Footer Links */}
        <div className="text-center text-slate-500 border-t border-slate-200 pt-8 mt-12">
          <p className="text-sm">
            Need help? Visit our <Link to="/documentation" className="text-blue-600 font-semibold hover:underline">documentation</Link> or contact <Link to="/support" className="text-blue-600 font-semibold hover:underline">support</Link>.
          </p>
        </div>

      </div>
    </div>
  );
}