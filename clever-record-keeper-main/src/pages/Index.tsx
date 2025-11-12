import { useEffect, useState } from "react";
import { Auth } from "@/components/Auth";
import { Dashboard } from "@/components/Dashboard";
import { getSession, onAuthStateChange } from "@/lib/auth";

type Session = { user: { id: string; email: string } } | null;

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { subscription } = onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return session ? <Dashboard /> : <Auth />;
};

export default Index;