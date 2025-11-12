import { useState, useMemo } from "react";
import { deleteStudent } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Pencil, Trash2, Award, User } from "lucide-react";
import { EditStudentDialog } from "./EditStudentDialog";

interface Student {
  id: string;
  name: string;
  age: number;
  class: string;
  subjects: string[];
  grades: Record<string, number>;
  created_at: string;
  updated_at: string;
  address?: { line1: string; city: string; state: string; zip: string };
  parent?: { name: string; phone: string; relation: string };
  class_teacher?: { name: string; phone?: string; email?: string };
  subject_heads?: Record<string, { name: string; phone?: string; email?: string }>;
}

interface StudentListProps {
  students: Student[];
  loading: boolean;
  onRefresh: () => void;
}

export const StudentList = ({ students, loading, onRefresh }: StudentListProps) => {
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [minGrade, setMinGrade] = useState<number | "">("");

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    
    setDeleting(id);
    try {
      await deleteStudent(id);
      toast.success("Student deleted successfully");
      onRefresh();
    } catch (err) {
      toast.error("Failed to delete student");
      console.error(err);
    }
    setDeleting(null);
  };

  const calculateAverage = (grades: Record<string, number>) => {
    const values = Object.values(grades);
    if (values.length === 0) return "N/A";
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return avg.toFixed(1);
  };

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (q) {
        const hay = `${s.name} ${s.class} ${(s.subjects || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (minGrade !== "") {
        const vals = Object.values(s.grades || {});
        if (vals.length === 0) return false;
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (avg < Number(minGrade)) return false;
      }
      return true;
    });
  }, [students, query, minGrade]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Students Yet</h3>
        <p className="text-muted-foreground">Add your first student to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-2 w-full md:w-1/2">
          <Input
            placeholder="Search by name, subject or class"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Min avg grade %"
            type="number"
            value={minGrade as any}
            onChange={(e) => setMinGrade(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-36"
          />
        </div>
        <div className="text-sm text-muted-foreground">Showing {filteredStudents.length} of {students.length}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => (
          <Card key={student.id} className="hover:shadow-[var(--shadow-elevation)] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{student.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {student.age} years • {student.class}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingStudent(student)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(student.id)}
                    disabled={deleting === student.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Subjects</p>
                  <div className="flex flex-wrap gap-1">
                    {student.subjects.map((subject, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Average Grade</span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {calculateAverage(student.grades)}%
                  </span>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Parent / Contact</p>
                  <div className="text-sm">
                    {student.parent ? (
                      <>
                        <div>{student.parent.name} • {student.parent.relation}</div>
                        <div className="text-muted-foreground text-xs">{student.parent.phone}</div>
                      </>
                    ) : (
                      <div className="text-muted-foreground text-xs">No parent info</div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Class Teacher</p>
                  <div className="text-sm">
                    {student.class_teacher ? (
                      <>
                        <div>{student.class_teacher.name}</div>
                        <div className="text-muted-foreground text-xs">{student.class_teacher.email} • {student.class_teacher.phone}</div>
                      </>
                    ) : (
                      <div className="text-muted-foreground text-xs">No teacher assigned</div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Address</p>
                  <div className="text-sm text-muted-foreground">
                    {student.address ? (
                      <div>{student.address.line1}, {student.address.city} {student.address.state} - {student.address.zip}</div>
                    ) : (
                      <div>No address</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EditStudentDialog
        student={editingStudent}
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
        onSuccess={onRefresh}
      />
    </>
  );
};


