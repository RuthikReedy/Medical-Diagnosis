

# AI Medical Imaging Diagnosis Platform

## Overview
A web application where doctors/users can upload medical images (X-rays, CT scans, MRI, skin photos), get AI-powered disease diagnosis with staging and detailed explanations, and manage patient history with reports.

---

## 1. Authentication & User Profiles
- Email/password sign-up and login
- Profiles table storing: display name, role (doctor/researcher), institution, specialization
- Protected routes — only authenticated users can access the app

## 2. Dashboard
- Overview stats: total scans analyzed, diseases detected, recent activity
- Charts showing disease distribution across diagnoses
- Quick-access cards to start new analysis or view recent results

## 3. Image Upload & AI Analysis
- Upload page supporting multiple image types (X-ray, CT, MRI, skin photos)
- User selects imaging type and body region before uploading
- Images stored in Supabase Storage bucket
- AI analysis powered by **Lovable AI (Gemini vision model)** that:
  - Examines the uploaded medical image in detail
  - Identifies whether disease indicators are present or not
  - Determines the stage of disease (if applicable)
  - Provides a detailed explanation of findings, disease description, symptoms, and recommended next steps
- Results displayed with a clear verdict: **Disease Found / Not Found**, stage classification, and detailed breakdown

## 4. Patient History & Records
- Each diagnosis is saved to a database with: patient name, image, diagnosis result, date, doctor notes
- Browse and search past diagnoses
- Filter by disease type, date range, or patient

## 5. Doctor Notes & Annotations
- Doctors can add clinical notes to any diagnosis
- Override or amend AI findings with professional assessment
- Notes are timestamped and linked to the diagnosis record

## 6. Report Generation
- Generate a summary report for any diagnosis
- Downloadable as PDF including: patient info, image, AI findings, doctor notes, date
- Shareable format for clinical use

## 7. Analytics Dashboard
- Charts showing: disease distribution, scans over time, detection rates
- Breakdown by imaging type (X-ray vs CT vs MRI vs skin)
- Stage distribution across detected diseases

