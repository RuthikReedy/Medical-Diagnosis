import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type DiagnosisRow = Tables<"diagnoses">;

export default function History() {
  const { user } = useAuth();
  const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("diagnoses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDiagnoses(data || []);
        setLoading(false);
      });
  }, [user]);

  const filtered = diagnoses.filter((d) => {
    const matchesSearch =
      d.patient_name.toLowerCase().includes(search.toLowerCase()) ||
      (d.disease_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesType = filterType === "all" || d.imaging_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patient History</h1>
        <p className="text-muted-foreground mt-1">Browse and search past diagnoses</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient or disease..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="xray">X-Ray</SelectItem>
            <SelectItem value="ct">CT Scan</SelectItem>
            <SelectItem value="mri">MRI</SelectItem>
            <SelectItem value="skin">Skin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {diagnoses.length === 0 ? "No diagnoses yet. Start your first analysis!" : "No results match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Link key={d.id} to={`/diagnosis/${d.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {d.image_url && (
                      <img
                        src={d.image_url}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover bg-muted"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{d.patient_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.imaging_type.toUpperCase()} • {d.body_region || "N/A"} • {new Date(d.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {d.disease_found ? (
                      <Badge variant="destructive">{d.disease_name || "Disease"}</Badge>
                    ) : (
                      <Badge className="bg-success text-success-foreground">Healthy</Badge>
                    )}
                    {d.disease_stage && <Badge variant="outline">Stage {d.disease_stage}</Badge>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
