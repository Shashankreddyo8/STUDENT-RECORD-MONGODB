import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  age: number;
  class: string;
  subjects: string[];
  grades: Record<string, number>;
}

interface ClassSummaryProps {
  students: Student[];
  onSelectClass: (className: string) => void;
}

export const ClassSummary = ({ students, onSelectClass }: ClassSummaryProps) => {
  // group students by class
  const groups: Record<string, Student[]> = {};
  students.forEach((s) => {
    const key = s.class || "Unassigned";
    groups[key] = groups[key] || [];
    groups[key].push(s);
  });

  const rows = Object.entries(groups).map(([className, list]) => {
    // compute average grade per class
    const averages = list.map((stu) => {
      const vals = Object.values(stu.grades || {});
      if (vals.length === 0) return 0;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });
    const avg = averages.length ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) / 10 : 0;
    const uniqueSubjects = new Set<string>(list.flatMap((s) => s.subjects || []));
    // compute letter grades counts
    const buckets = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
    averages.forEach((g) => {
      if (g >= 85) buckets.A += 1;
      else if (g >= 70) buckets.B += 1;
      else if (g >= 50) buckets.C += 1;
      else buckets.D += 1;
    });

    return { className, count: list.length, avg, uniqueSubjects: uniqueSubjects.size, buckets };
  });

  return (
    <Card className="shadow-[var(--shadow-elevation)]">
      <CardHeader>
        <CardTitle>Class Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-auto">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Students</th>
                <th className="px-3 py-2">Average Grade</th>
                <th className="px-3 py-2">Subjects</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.className}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelectClass(r.className)}
                >
                  <td className="px-3 py-2 font-medium">{r.className}</td>
                  <td className="px-3 py-2">{r.count}</td>
                  <td className="px-3 py-2">{r.avg ? `${r.avg}%` : "N/A"}</td>
                  <td className="px-3 py-2">{r.uniqueSubjects}</td>
                  <td className="px-3 py-2">
                    <div className="w-40 h-3 rounded overflow-hidden bg-muted/30 flex">
                      {Object.entries(r.buckets).map(([k, v], idx) => (
                        <div
                          key={k}
                          title={`${k}: ${v}`}
                          className={cn("h-3", {
                            "bg-emerald-500": k === "A",
                            "bg-sky-500": k === "B",
                            "bg-amber-400": k === "C",
                            "bg-red-500": k === "D",
                          })}
                          style={{ flex: v }}
                        />
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">A/B/C/D: {r.buckets.A}/{r.buckets.B}/{r.buckets.C}/{r.buckets.D}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassSummary;
