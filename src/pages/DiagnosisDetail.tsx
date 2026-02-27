import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  Download,
  Loader2,
} from "lucide-react";
import jsPDF from "jspdf";
import type { Tables, Json } from "@/integrations/supabase/types";

type DiagnosisRow = Tables<"diagnoses">;
type NoteRow = Tables<"doctor_notes">;

interface AnalysisResult {
  summary?: string;
  findings?: string;
  description?: string;
  symptoms?: string;
  recommendations?: string;
  [key: string]: unknown;
}

function parseAnalysis(result: Json | null): AnalysisResult {
  if (!result || typeof result !== "object" || Array.isArray(result)) return {};
  return result as unknown as AnalysisResult;
}

export default function DiagnosisDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [diagnosis, setDiagnosis] = useState<DiagnosisRow | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("diagnoses").select("*").eq("id", id).single(),
      supabase.from("doctor_notes").select("*").eq("diagnosis_id", id).order("created_at", { ascending: true }),
    ]).then(([diagRes, notesRes]) => {
      setDiagnosis(diagRes.data);
      setNotes(notesRes.data || []);
      setLoading(false);
    });
  }, [id]);

  const addNote = async () => {
    if (!user || !id || !newNote.trim()) return;
    setAddingNote(true);
    const { data, error } = await supabase
      .from("doctor_notes")
      .insert({ diagnosis_id: id, user_id: user.id, note: newNote.trim() })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (data) {
      setNotes((prev) => [...prev, data]);
      setNewNote("");
    }
    setAddingNote(false);
  };

  const generatePDF = () => {
    if (!diagnosis) return;
    const analysis = parseAnalysis(diagnosis.diagnosis_result);
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(20);
    doc.text("MedVision AI - Diagnosis Report", 20, y);
    y += 15;

    doc.setFontSize(12);
    doc.text(`Patient: ${diagnosis.patient_name}`, 20, y); y += 8;
    doc.text(`Date: ${new Date(diagnosis.created_at).toLocaleDateString()}`, 20, y); y += 8;
    doc.text(`Imaging: ${diagnosis.imaging_type.toUpperCase()}`, 20, y); y += 8;
    if (diagnosis.body_region) { doc.text(`Region: ${diagnosis.body_region}`, 20, y); y += 8; }
    y += 5;

    doc.setFontSize(14);
    doc.text(`Result: ${diagnosis.disease_found ? "Disease Found" : "No Disease Found"}`, 20, y);
    y += 10;

    if (diagnosis.disease_name) { doc.text(`Disease: ${diagnosis.disease_name}`, 20, y); y += 8; }
    if (diagnosis.disease_stage) { doc.text(`Stage: ${diagnosis.disease_stage}`, 20, y); y += 8; }
    y += 5;

    doc.setFontSize(12);
    if (analysis.summary) {
      doc.text("Summary:", 20, y); y += 7;
      const lines = doc.splitTextToSize(analysis.summary, 170);
      doc.text(lines, 20, y); y += lines.length * 6 + 5;
    }

    if (analysis.findings) {
      doc.text("Findings:", 20, y); y += 7;
      const lines = doc.splitTextToSize(analysis.findings, 170);
      doc.text(lines, 20, y); y += lines.length * 6 + 5;
    }

    if (analysis.recommendations) {
      doc.text("Recommendations:", 20, y); y += 7;
      const lines = doc.splitTextToSize(analysis.recommendations, 170);
      doc.text(lines, 20, y);
    }

    if (notes.length > 0) {
      doc.addPage();
      y = 20;
      doc.setFontSize(14);
      doc.text("Doctor Notes", 20, y); y += 10;
      doc.setFontSize(11);
      notes.forEach((n) => {
        doc.text(`[${new Date(n.created_at).toLocaleString()}]`, 20, y); y += 6;
        const lines = doc.splitTextToSize(n.note, 170);
        doc.text(lines, 20, y); y += lines.length * 6 + 5;
      });
    }

    doc.save(`diagnosis-${diagnosis.patient_name}-${diagnosis.id.slice(0, 8)}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!diagnosis) {
    return <p className="text-center text-muted-foreground py-16">Diagnosis not found.</p>;
  }

  const analysis = parseAnalysis(diagnosis.diagnosis_result);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{diagnosis.patient_name}</h1>
          <p className="text-muted-foreground mt-1">
            {diagnosis.imaging_type.toUpperCase()} • {diagnosis.body_region || "N/A"} • {new Date(diagnosis.created_at).toLocaleDateString()}
          </p>
        </div>
        <Button onClick={generatePDF} variant="outline">
          <Download className="h-4 w-4 mr-2" /> Export PDF
        </Button>
      </div>

      {/* Verdict */}
      <Card className={diagnosis.disease_found ? "border-destructive/30 bg-destructive/5" : "border-success/30 bg-success/5"}>
        <CardContent className="p-6 flex items-center gap-4">
          {diagnosis.disease_found ? (
            <AlertTriangle className="h-10 w-10 text-destructive" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-success" />
          )}
          <div>
            <h2 className="text-xl font-bold">
              {diagnosis.disease_found ? "Disease Detected" : "No Disease Detected"}
            </h2>
            <div className="flex gap-2 mt-1">
              {diagnosis.disease_name && <Badge variant="destructive">{diagnosis.disease_name}</Badge>}
              {diagnosis.disease_stage && <Badge variant="outline">Stage {diagnosis.disease_stage}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Image */}
        {diagnosis.image_url && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Medical Image</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={diagnosis.image_url}
                alt="Medical scan"
                className="rounded-lg w-full object-contain max-h-80 bg-muted"
              />
            </CardContent>
          </Card>
        )}

        {/* AI Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" /> AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {analysis.summary && (
              <div>
                <h4 className="font-semibold text-foreground mb-1">Summary</h4>
                <p className="text-muted-foreground">{analysis.summary}</p>
              </div>
            )}
            {analysis.findings && (
              <div>
                <h4 className="font-semibold text-foreground mb-1">Detailed Findings</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{analysis.findings}</p>
              </div>
            )}
            {analysis.description && (
              <div>
                <h4 className="font-semibold text-foreground mb-1">Disease Description</h4>
                <p className="text-muted-foreground">{analysis.description}</p>
              </div>
            )}
            {analysis.symptoms && (
              <div>
                <h4 className="font-semibold text-foreground mb-1">Symptoms</h4>
                <p className="text-muted-foreground">{analysis.symptoms}</p>
              </div>
            )}
            {analysis.recommendations && (
              <div>
                <h4 className="font-semibold text-foreground mb-1">Recommendations</h4>
                <p className="text-muted-foreground">{analysis.recommendations}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Doctor Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Doctor Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm">{note.note}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(note.created_at).toLocaleString()}
              </p>
            </div>
          ))}
          <div className="space-y-2">
            <Textarea
              placeholder="Add clinical notes or professional assessment..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <Button onClick={addNote} disabled={addingNote || !newNote.trim()} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {addingNote ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
