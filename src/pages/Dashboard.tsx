import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Upload,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

const chartConfig: ChartConfig = {
  count: { label: "Count", color: "hsl(var(--primary))" },
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
];

type Diagnosis = {
  id: string;
  patient_name: string;
  disease_found: boolean | null;
  disease_name: string | null;
  disease_stage: string | null;
  imaging_type: string;
  created_at: string;
};

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("diagnoses")
      .select("id, patient_name, disease_found, disease_name, disease_stage, imaging_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setDiagnoses(data || []);
        setLoading(false);
      });
  }, [user]);

  const totalScans = diagnoses.length;
  const diseasesDetected = diagnoses.filter((d) => d.disease_found).length;
  const healthyScans = diagnoses.filter((d) => d.disease_found === false).length;
  const recentScans = diagnoses.slice(0, 5);

  // Disease distribution for chart
  const diseaseMap: Record<string, number> = {};
  diagnoses.forEach((d) => {
    if (d.disease_name) {
      diseaseMap[d.disease_name] = (diseaseMap[d.disease_name] || 0) + 1;
    }
  });
  const diseaseData = Object.entries(diseaseMap)
    .map(([name, count]) => ({ name, count }))
    .slice(0, 6);

  // Imaging type breakdown
  const typeMap: Record<string, number> = {};
  diagnoses.forEach((d) => {
    const label = d.imaging_type === "xray" ? "X-Ray" : d.imaging_type === "ct" ? "CT Scan" : d.imaging_type === "mri" ? "MRI" : "Skin";
    typeMap[label] = (typeMap[label] || 0) + 1;
  });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.display_name?.split(" ")[0] || "Doctor"}
        </h1>
        <p className="text-muted-foreground mt-1">Here's your diagnostic overview</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Scans</p>
                <p className="text-3xl font-bold mt-1">{totalScans}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Diseases Detected</p>
                <p className="text-3xl font-bold mt-1">{diseasesDetected}</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Healthy Results</p>
                <p className="text-3xl font-bold mt-1">{healthyScans}</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Detection Rate</p>
                <p className="text-3xl font-bold mt-1">
                  {totalScans > 0 ? Math.round((diseasesDetected / totalScans) * 100) : 0}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link to="/analyze">
            <Upload className="h-5 w-5 mr-2" /> New Analysis
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/history">
            <Clock className="h-5 w-5 mr-2" /> View History
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Disease Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Disease Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {diseaseData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={diseaseData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No diagnosis data yet. Start your first analysis!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Imaging Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Imaging Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No scans yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Diagnoses</CardTitle>
        </CardHeader>
        <CardContent>
          {recentScans.length > 0 ? (
            <div className="space-y-3">
              {recentScans.map((d) => (
                <Link
                  key={d.id}
                  to={`/diagnosis/${d.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${d.disease_found ? "bg-destructive" : "bg-success"}`} />
                    <div>
                      <p className="font-medium">{d.patient_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.imaging_type.toUpperCase()} • {new Date(d.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.disease_found ? (
                      <Badge variant="destructive">{d.disease_name || "Disease Found"}</Badge>
                    ) : (
                      <Badge className="bg-success text-success-foreground">Healthy</Badge>
                    )}
                    {d.disease_stage && (
                      <Badge variant="outline">Stage {d.disease_stage}</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No diagnoses yet. Upload your first medical image to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
