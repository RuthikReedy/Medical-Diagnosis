import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type DiagnosisRow = Tables<"diagnoses">;

const chartConfig: ChartConfig = {
  count: { label: "Count", color: "hsl(var(--primary))" },
  value: { label: "Value", color: "hsl(var(--primary))" },
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(199 89% 60%)",
  "hsl(172 66% 55%)",
];

export default function Analytics() {
  const { user } = useAuth();
  const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("diagnoses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setDiagnoses(data || []);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Disease distribution
  const diseaseMap: Record<string, number> = {};
  diagnoses.forEach((d) => {
    if (d.disease_name) diseaseMap[d.disease_name] = (diseaseMap[d.disease_name] || 0) + 1;
  });
  const diseaseData = Object.entries(diseaseMap).map(([name, count]) => ({ name, count }));

  // Imaging type
  const typeMap: Record<string, number> = {};
  diagnoses.forEach((d) => {
    const label = d.imaging_type === "xray" ? "X-Ray" : d.imaging_type === "ct" ? "CT" : d.imaging_type === "mri" ? "MRI" : "Skin";
    typeMap[label] = (typeMap[label] || 0) + 1;
  });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  // Scans over time (by month)
  const monthMap: Record<string, number> = {};
  diagnoses.forEach((d) => {
    const m = new Date(d.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short" });
    monthMap[m] = (monthMap[m] || 0) + 1;
  });
  const timeData = Object.entries(monthMap).map(([month, count]) => ({ month, count }));

  // Stage distribution
  const stageMap: Record<string, number> = {};
  diagnoses.forEach((d) => {
    if (d.disease_stage) stageMap[`Stage ${d.disease_stage}`] = (stageMap[`Stage ${d.disease_stage}`] || 0) + 1;
  });
  const stageData = Object.entries(stageMap).map(([name, value]) => ({ name, value }));

  const hasData = diagnoses.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Insights from your diagnostic history</p>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No data to display yet. Complete some analyses first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">Disease Distribution</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px]">
                <BarChart data={diseaseData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Imaging Type Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px]">
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Scans Over Time</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px]">
                <LineChart data={timeData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Stage Distribution</CardTitle></CardHeader>
            <CardContent>
              {stageData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[280px]">
                  <PieChart>
                    <Pie data={stageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {stageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  No stage data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
