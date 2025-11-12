import { useState, useEffect } from "react";
import { updateStudent, Student } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditStudentDialog = ({ student, open, onOpenChange, onSuccess }: EditStudentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentRelation, setParentRelation] = useState("");

  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");

  useEffect(() => {
    if (student) {
      setName(student.name);
      setAge(student.age.toString());
      setStudentClass(student.class);
      setSubjects(student.subjects.length > 0 ? student.subjects : [""]);
      
      const stringGrades: Record<string, string> = {};
      Object.entries(student.grades).forEach(([subject, grade]) => {
        stringGrades[subject] = grade.toString();
      });
      setGrades(stringGrades);
      // initialize parent / address
      setParentName(student.parent?.name || "");
      setParentPhone(student.parent?.phone || "");
      setParentRelation(student.parent?.relation || "");

      setAddressLine1(student.address?.line1 || "");
      setAddressCity(student.address?.city || "");
      setAddressState(student.address?.state || "");
      setAddressZip(student.address?.zip || "");
    }
  }, [student]);

  const handleAddSubject = () => {
    setSubjects([...subjects, ""]);
  };

  const handleRemoveSubject = (index: number) => {
    const newSubjects = subjects.filter((_, i) => i !== index);
    setSubjects(newSubjects);
    const newGrades = { ...grades };
    delete newGrades[subjects[index]];
    setGrades(newGrades);
  };

  const handleSubjectChange = (index: number, value: string) => {
    const newSubjects = [...subjects];
    const oldSubject = newSubjects[index];
    newSubjects[index] = value;
    setSubjects(newSubjects);
    
    if (oldSubject && grades[oldSubject]) {
      const newGrades = { ...grades };
      newGrades[value] = newGrades[oldSubject];
      delete newGrades[oldSubject];
      setGrades(newGrades);
    }
  };

  const handleGradeChange = (subject: string, value: string) => {
    setGrades({ ...grades, [subject]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!student || !name || !age || !studentClass) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    
    const validSubjects = subjects.filter(s => s.trim());
    const numericGrades: Record<string, number> = {};
    
    validSubjects.forEach(subject => {
      if (grades[subject]) {
        numericGrades[subject] = parseFloat(grades[subject]) || 0;
      }
    });

    try {
      await updateStudent(student.id, {
        name: name.trim(),
        age: parseInt(age),
        class: studentClass.trim(),
        subjects: validSubjects,
        grades: numericGrades,
        parent: parentName || parentPhone || parentRelation ? {
          name: parentName.trim() || undefined,
          phone: parentPhone.trim() || undefined,
          relation: parentRelation.trim() || undefined,
        } : undefined,
        address: addressLine1 || addressCity || addressState || addressZip ? {
          line1: addressLine1.trim() || undefined,
          city: addressCity.trim() || undefined,
          state: addressState.trim() || undefined,
          zip: addressZip.trim() || undefined,
        } : undefined,
      });
      toast.success("Student updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to update student");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update student information and grades
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Student name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-age">Age *</Label>
              <Input
                id="edit-age"
                type="number"
                min="5"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-class">Class *</Label>
            <Input
              id="edit-class"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              placeholder="e.g., Class 10, Grade 5"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-parent-name">Parent / Guardian Name</Label>
              <Input id="edit-parent-name" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g., Mr. Singh" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-parent-phone">Parent Phone</Label>
              <Input id="edit-parent-phone" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="+91xxxxxxxxxx" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-parent-relation">Relation</Label>
              <Input id="edit-parent-relation" value={parentRelation} onChange={(e) => setParentRelation(e.target.value)} placeholder="Father / Mother" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address-line1">Address (Line 1)</Label>
              <Input id="edit-address-line1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Street / locality" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address-city">City</Label>
              <Input id="edit-address-city" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="City" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address-state">State</Label>
              <Input id="edit-address-state" value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="State" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address-zip">ZIP / Postal Code</Label>
              <Input id="edit-address-zip" value={addressZip} onChange={(e) => setAddressZip(e.target.value)} placeholder="ZIP" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Subjects & Grades *</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSubject}>
                <Plus className="w-4 h-4 mr-1" />
                Add Subject
              </Button>
            </div>
            
            <div className="space-y-2">
              {subjects.map((subject, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Subject name"
                    value={subject}
                    onChange={(e) => handleSubjectChange(index, e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Grade %"
                    value={grades[subject] || ""}
                    onChange={(e) => handleGradeChange(subject, e.target.value)}
                    className="w-24"
                    disabled={!subject}
                  />
                  {subjects.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSubject(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};