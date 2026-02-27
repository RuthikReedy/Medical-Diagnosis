import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Brain, Eye, Activity, HeartPulse } from "lucide-react";

const imagingTypes = [
  { value: "xray", label: "X-Ray", icon: Eye },
  { value: "ct", label: "CT Scan", icon: Activity },
  { value: "mri", label: "MRI", icon: Brain },
  { value: "skin", label: "Skin Photo", icon: HeartPulse },
];

export default function Analyze() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patientName, setPatientName] = useState("");
  const [imagingType, setImagingType] = useState("");
  const [bodyRegion, setBodyRegion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;
    setLoading(true);

    try {
      // Upload image to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("medical-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("medical-images")
        .getPublicUrl(filePath);

      // Convert image to base64 for AI analysis
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const base64Image = await base64Promise;

      // Call AI analysis edge function
      const { data: aiResult, error: aiError } = await supabase.functions.invoke("analyze-image", {
        body: {
          image: base64Image,
          imaging_type: imagingType,
          body_region: bodyRegion,
          patient_name: patientName,
        },
      });

      if (aiError) throw aiError;

      // Save diagnosis to database
      const { data: diagnosis, error: dbError } = await supabase
        .from("diagnoses")
        .insert({
          user_id: user.id,
          patient_name: patientName,
          image_url: urlData.publicUrl,
          imaging_type: imagingType,
          body_region: bodyRegion,
          diagnosis_result: aiResult.analysis,
          disease_found: aiResult.disease_found,
          disease_stage: aiResult.disease_stage,
          disease_name: aiResult.disease_name,
        })
        .select("id")
        .single();

      if (dbError) throw dbError;

      toast({ title: "Analysis complete!", description: "Your diagnosis report is ready." });
      navigate(`/diagnosis/${diagnosis.id}`);
    } catch (err: unknown) {
      const error = err as Error;
      toast({
        title: "Analysis failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Analysis</h1>
        <p className="text-muted-foreground mt-1">Upload a medical image for AI-powered diagnosis</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient-name">Patient Name</Label>
              <Input
                id="patient-name"
                placeholder="Enter patient name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Imaging Type</Label>
                <Select value={imagingType} onValueChange={setImagingType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {imagingTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <t.icon className="h-4 w-4" />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="body-region">Body Region</Label>
                <Input
                  id="body-region"
                  placeholder="e.g., Chest, Brain, Left Arm"
                  value={bodyRegion}
                  onChange={(e) => setBodyRegion(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical Image</CardTitle>
            <CardDescription>Upload X-Ray, CT, MRI, or skin photo for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Medical image preview"
                    className="max-h-64 mx-auto rounded-lg object-contain"
                  />
                  <p className="text-sm text-muted-foreground">{file?.name}</p>
                  <Button type="button" variant="outline" onClick={() => { setFile(null); setPreview(null); }}>
                    Change Image
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer space-y-3 block">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted-foreground">PNG, JPG, DICOM up to 20MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    required
                  />
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={loading || !file || !imagingType || !patientName}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Brain className="h-5 w-5 mr-2" />
              Start AI Analysis
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
