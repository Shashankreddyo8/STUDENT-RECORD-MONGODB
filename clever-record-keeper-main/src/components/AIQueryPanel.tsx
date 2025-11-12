import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles, RotateCcw } from "lucide-react";

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

/**
 * AIQueryPanel (Fully client-side, no API)
 * - Supports queries like:
 *   "above 85", "class 10", "math above 90", "name john", "top 5 by avg", "sort by name asc"
 * - Returns results via onResultsUpdate(students)
 * - Shows explanation, preview of first 6 results, and keeps UI responsive
 */
interface AIQueryPanelProps {
  onResultsUpdate: (students: Student[]) => void;
  allStudents: Student[];
}

export const AIQueryPanel: React.FC<AIQueryPanelProps> = ({ onResultsUpdate, allStudents }) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState("");

  // utility: compute average (or undefined if no grades)
  const avgFor = (s: Student) => {
    const vals = Object.values(s.grades || {});
    if (!vals.length) return undefined;
    const sum = vals.reduce((a, b) => a + b, 0);
    return sum / vals.length;
  };

  // utility: text-normalize (lowercase & collapse)
  const norm = (t?: string) => (t || "").toLowerCase().trim();

  // Basic fuzzy contains check (token by token)
  const textMatch = (hay: string, q: string) => {
    const hayTokens = hay.toLowerCase().split(/\s+/).filter(Boolean);
    const qTokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    return qTokens.every((qt) => hayTokens.some((ht) => ht.includes(qt)));
  };

  // parse and run query fully client-side
  const runQuery = async (rawQuery: string) => {
    const q = rawQuery.trim();
    if (!q) {
      setExplanation("");
      onResultsUpdate(allStudents);
      return;
    }

    setLoading(true);
    // small artificial delay so user sees "Querying..." for quick queries (nice UX)
    await new Promise((r) => setTimeout(r, 150));

    // defaults
    let results = allStudents.slice();
    let explanationParts: string[] = [];

    const qLower = q.toLowerCase();

    // 1) parse "top N" or "top N by [avg|attendance]"
    const topMatch = qLower.match(/\btop\s+(\d{1,3})\b/);
    let topN: number | undefined;
    if (topMatch) {
      topN = parseInt(topMatch[1], 10);
      explanationParts.push(`Take top ${topN}`);
    }

    // 2) parse "above X" optionally with subject like "math above 85" or "above 85"
    // Look for "<subject> above 85" or "above 85 in <subject>"
    const subjAboveMatch = qLower.match(/([\w&+-]+)\s+above\s+(\d{1,3})/); // e.g., "math above 85"
    const aboveInMatch = qLower.match(/above\s+(\d{1,3})(?:\s+in\s+([\w&+-]+))?/); // "above 85 in math" or just "above 85"
    if (subjAboveMatch) {
      const subject = subjAboveMatch[1];
      const threshold = parseFloat(subjAboveMatch[2]);
      results = results.filter((s) => {
        const val = (s.grades || {})[subject];
        if (typeof val === "number") return val > threshold;
        // if subject not present, fallback to avg
        const avg = avgFor(s);
        return typeof avg === "number" ? avg > threshold : false;
      });
      explanationParts.push(`Filter: ${subject.toUpperCase()} > ${subjAboveMatch[2]}`);
    } else if (aboveInMatch) {
      const threshold = parseFloat(aboveInMatch[1]);
      const maybeSubject = aboveInMatch[2];
      if (maybeSubject) {
        results = results.filter((s) => {
          const val = (s.grades || {})[maybeSubject];
          if (typeof val === "number") return val > threshold;
          const avg = avgFor(s);
          return typeof avg === "number" ? avg > threshold : false;
        });
        explanationParts.push(`Filter: ${maybeSubject.toUpperCase()} > ${threshold}`);
      } else {
        // apply to average
        results = results.filter((s) => {
          const avg = avgFor(s);
          return typeof avg === "number" ? avg > threshold : false;
        });
        explanationParts.push(`Filter: average > ${threshold}`);
      }
    }

    // 3) parse class token e.g., "class 10" or "class 1"
    const classMatch = qLower.match(/\bclass\s+([^\s,]+)/);
    if (classMatch) {
      const cls = classMatch[1];
      results = results.filter((s) => norm(s.class).includes(norm(cls)));
      explanationParts.push(`Class matches '${cls}'`);
    }

    // 4) parse subject-only filter like "math" or "science" (keep students who have that subject or subject name appears)
    // But avoid matching english words like "above" or "top" — only when standalone token exists AND isn't part of earlier tokens
    const subjectTokens = qLower
      .split(/\s+/)
      .filter((t) => !["above", "top", "by", "in", "class", "sort", "order", "name"].includes(t));
    // we'll test for any token that matches subject names in records
    const uniqueSubjects: Set<string> = new Set();
    allStudents.forEach((s) => (s.subjects || []).forEach((sub) => uniqueSubjects.add(norm(sub))));
    const detectedSubjects = [...new Set(subjectTokens.filter((t) => uniqueSubjects.has(t)))];
    if (detectedSubjects.length) {
      // filter by any of the detected subjects (keep students who have at least one)
      results = results.filter((s) => detectedSubjects.some((sub) => (s.subjects || []).map(norm).includes(sub)));
      explanationParts.push(`Subject filter: ${detectedSubjects.join(", ")}`);
    }

    // 5) name search: "name john" or bare token name
    const nameMatch = qLower.match(/\bname\s+([a-zA-Z]+)\b/);
    if (nameMatch) {
      const nm = nameMatch[1];
      results = results.filter((s) => norm(s.name).includes(nm));
      explanationParts.push(`Name contains '${nm}'`);
    } else {
      // generic text match across name/class/subjects if none of the above parsed (fallback)
      // we avoid doing this always because we prefer explicit filters first, but still apply if query hasn't filtered anything
      // Determine whether the user typed mostly tokens not handled above (like plain "john math")
      const handledTokens = new Set<string>();
      [topMatch, subjAboveMatch, aboveInMatch, classMatch, nameMatch].forEach((m) => {
        if (m && m[0]) m[0].split(/\s+/).forEach((t) => handledTokens.add(t));
      });
      const plainTokens = qLower
        .split(/\s+/)
        .filter((t) => t && !handledTokens.has(t) && !["show", "find", "list", "students", "with", "and", "the", "in"].includes(t));
      if (plainTokens.length) {
        results = results.filter((s) => {
          const hay = `${s.name} ${s.class} ${(s.subjects || []).join(" ")}`.toLowerCase();
          return plainTokens.every((tok) => hay.includes(tok));
        });
        explanationParts.push(`Text match: ${plainTokens.join(" ")}`);
      }
    }

    // 6) Sorting: "sort by avg desc", "sort by name asc", "by avg", "by name"
    // Also check "topN by avg" earlier to know we must sort by something (default avg)
    let sortKey: "avg" | "name" | "attendance" | null = null;
    let sortDir: "asc" | "desc" = "desc";
    const sortMatch = qLower.match(/\b(sort|by|order)\s+(?:by\s+)?(avg|name|attendance|age)\b(?:\s+(asc|desc|ascending|descending))?/);
    if (sortMatch) {
      sortKey = (sortMatch[2] as any) === "age" ? "attendance" : (sortMatch[2] as any); // no attendance field - placeholder
      const dir = sortMatch[3];
      if (dir && (dir.startsWith("asc") || dir === "ascending")) sortDir = "asc";
      else sortDir = "desc";
    } else if (topN) {
      sortKey = "avg";
      sortDir = "desc";
    }

    if (sortKey) {
      explanationParts.push(`Sort by ${sortKey} (${sortDir})`);
      results = results.slice().sort((a, b) => {
        if (sortKey === "name") {
          if (sortDir === "asc") return a.name.localeCompare(b.name);
          return b.name.localeCompare(a.name);
        }
        if (sortKey === "avg") {
          const aa = avgFor(a) ?? -Infinity;
          const bb = avgFor(b) ?? -Infinity;
          return sortDir === "asc" ? aa - bb : bb - aa;
        }
        // fallback: no attendance field in student - keep stable
        return 0;
      });
    }

    // 7) apply topN if requested
    if (topN && topN > 0) {
      results = results.slice(0, topN);
      explanationParts.push(`Returning top ${topN}`);
    }

    // build final explanation
    const explanationText = explanationParts.length ? explanationParts.join(" • ") : `Matched ${results.length} students`;
    setExplanation(explanationText);
    onResultsUpdate(results);
    setLoading(false);
    toast.success(`Found ${results.length} students`);
  };

  const handleQuery = () => {
    if (!query.trim()) {
      toast.error("Please enter a query");
      return;
    }
    runQuery(query);
  };

  const handleReset = () => {
    setQuery("");
    setExplanation("");
    onResultsUpdate(allStudents);
    toast.info("Reset: showing all students");
  };

  // preview of first N results to show user immediate feedback
  const preview = useMemo(() => {
    return allStudents.slice(0, 6).map((s) => {
      const a = Object.values(s.grades || {});
      const avg = a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null;
      return { id: s.id, name: s.name, class: s.class, avg };
    });
  }, [allStudents]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Try: 'Show class 10 above 85', 'math above 90', 'top 5 by avg', 'name john', 'sort by name asc'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleQuery()}
          className="flex-1"
        />
        <Button onClick={handleQuery} disabled={loading} className="gap-2">
          <Sparkles className="w-4 h-4" />
          {loading ? "Querying..." : "Query"}
        </Button>
        <Button onClick={handleReset} variant="outline" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      {explanation && (
        <div className="p-3 rounded-lg bg-muted/50 border border-primary/20">
          <p className="text-sm">
            <span className="font-semibold text-primary">Interpretation: </span>
            {explanation}
          </p>
        </div>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Example queries</p>
        <ul className="list-disc list-inside ml-4">
          <li>"Show class 10"</li>
          <li>"Find students scoring above 85"</li>
          <li>"Math above 90"</li>
          <li>"Top 5 by avg"</li>
          <li>"Sort by name asc"</li>
        </ul>
      </div>

      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-2">Preview (first 6 students)</p>
        <div className="grid grid-cols-1 gap-2">
          {preview.map((p) => (
            <div key={p.id} className="flex justify-between text-xs">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-muted-foreground">{p.class}</div>
              </div>
              <div className="text-sm">{p.avg !== null ? `${p.avg}%` : "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIQueryPanel;
