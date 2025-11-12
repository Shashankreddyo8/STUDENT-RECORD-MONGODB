import { useState } from "react";
import { getUser } from "@/lib/auth";
import { addStudent } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddStudentDialog = ({ open, onOpenChange, onSuccess }: AddStudentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [subjects, setSubjects] = useState<string[]>([""]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  // parent and address
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentRelation, setParentRelation] = useState("");

  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");

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
    
    if (!name || !age || !studentClass || subjects.filter(s => s).length === 0) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    
    const { data: { user } } = await getUser();
    
    if (!user) {
      toast.error("You must be logged in");
      setLoading(false);
      return;
    }

    const validSubjects = subjects.filter(s => s.trim());
    const numericGrades: Record<string, number> = {};
    
    validSubjects.forEach(subject => {
      if (grades[subject]) {
        numericGrades[subject] = parseFloat(grades[subject]) || 0;
      }
    });

    try {
      await addStudent({
        user_id: user.id,
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
      toast.success("Student added successfully");
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast.error("Failed to add student");
      console.error(err);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setAge("");
    setStudentClass("");
    setSubjects([""]);
    setGrades({});
    setParentName("");
    setParentPhone("");
    setParentRelation("");
    setAddressLine1("");
    setAddressCity("");
    setAddressState("");
    setAddressZip("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter student information and grades
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Student name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
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
            <Label htmlFor="class">Class *</Label>
            <Input
              id="class"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              placeholder="e.g., Class 10, Grade 5"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parent-name">Parent / Guardian Name</Label>
              <Input id="parent-name" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g., Mr. Singh" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent-phone">Parent Phone</Label>
              <Input id="parent-phone" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="+91xxxxxxxxxx" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent-relation">Relation</Label>
              <Input id="parent-relation" value={parentRelation} onChange={(e) => setParentRelation(e.target.value)} placeholder="Father / Mother" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-line1">Address (Line 1)</Label>
              <Input id="address-line1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Street / locality" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-city">City</Label>
              <Input id="address-city" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} placeholder="City" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-state">State</Label>
              <Input id="address-state" value={addressState} onChange={(e) => setAddressState(e.target.value)} placeholder="State" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address-zip">ZIP / Postal Code</Label>
              <Input id="address-zip" value={addressZip} onChange={(e) => setAddressZip(e.target.value)} placeholder="ZIP" />
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
              {loading ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};