import { useState, useEffect } from "react";
import { signOut } from "@/lib/auth";
import { getStudents } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { LogOut, Users, BookOpen, TrendingUp, Sparkles } from "lucide-react";
import { StudentList } from "./StudentList";
import PerformanceChart from "./PerformanceChart";
import { AddStudentDialog } from "./AddStudentDialog";
import { AIQueryPanel } from "./AIQueryPanel";
import { ClassSummary } from "./ClassSummary";

interface Student {
  id: string;
  name: string;
  age: number;
  class: string;
  subjects: string[];
  grades: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export const Dashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  // Polling to keep UI in sync with MongoDB Compass edits made outside the app.
  // This helps ensure two-way visibility without requiring a manual reload.
  useEffect(() => {
    const interval = setInterval(() => {
      // force a network fetch to pick up external DB changes; if it fails, ignore but do not use stale cache
      (async () => {
        try {
          const data = await getStudents({ force: true });
          setStudents(data as Student[]);
        } catch (e) {
          console.debug('Periodic sync failed (backend may be unreachable)', e);
        }
      })();
    }, 5000); // every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // force network fetch to avoid stale local cache
      const data = await getStudents({ force: true });
      setStudents((data || []) as Student[]);
    } catch (err) {
      toast.error("Failed to fetch students");
      console.error(err);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
    }
  };

  const calculateStats = () => {
    const totalStudents = students.length;
    const totalSubjects = new Set(students.flatMap(s => s.subjects)).size;
    const avgGrade = students.reduce((acc, student) => {
      const grades = Object.values(student.grades);
      if (grades.length > 0) {
        return acc + grades.reduce((a, b) => a + b, 0) / grades.length;
      }
      return acc;
    }, 0) / (students.length || 1);

    return { totalStudents, totalSubjects, avgGrade: avgGrade.toFixed(1) };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Student Records</h1>
              <p className="text-sm text-muted-foreground">Management System</p>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-[var(--shadow-elevation)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">Active records</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elevation)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubjects}</div>
              <p className="text-xs text-muted-foreground">Across all students</p>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-elevation)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgGrade}%</div>
              <p className="text-xs text-muted-foreground">Overall performance</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-[var(--shadow-elevation-lg)] border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle>AI-Powered Query</CardTitle>
            </div>
            <CardDescription>
              Ask questions in plain English to find and analyze student records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AIQueryPanel onResultsUpdate={setStudents} allStudents={students} />
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-elevation)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Students</CardTitle>
              <CardDescription>View and manage student records</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedClass && (
                <Button variant="ghost" onClick={() => setSelectedClass(null)}>
                  Back
                </Button>
              )}
              <Button variant="outline" onClick={async () => {
                try {
                  const data = await getStudents({ force: true });
                  setStudents(data as Student[]);
                  toast.success('Synced with server');
                } catch (e) {
                  toast.error('Failed to sync with server');
                }
              }}>
                Sync
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                Add Student
              </Button>
            </div>
          </CardHeader>
          <CardContent>
              {!selectedClass ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <PerformanceChart students={students} initialMode="radial" />
                  <ClassSummary students={students} onSelectClass={(c) => setSelectedClass(c)} />
                </div>
              ) : (
                <StudentList 
                  students={students.filter((s) => s.class === selectedClass)} 
                  loading={loading}
                  onRefresh={fetchStudents}
                />
              )}
          </CardContent>
        </Card>
      </main>

      <AddStudentDialog 
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchStudents}
      />
    </div>
  );
};