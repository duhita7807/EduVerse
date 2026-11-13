import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import api from "../api/axios.js";
import { useToast } from "../context/ToastContext.jsx";
import { getErrorMessage } from "../utils/apiError.js";

/**
 * "Download Resume (PDF)" button. Pulls the latest profile from the API (or
 * uses the `profile` prop if the page already has it), builds an ATS-friendly
 * PDF in the browser and saves it as <Name>_Resume.pdf.
 *
 * The PDF library is loaded on first click, so it adds nothing to the initial
 * bundle. `options` is passed straight to generateResumePdf (summary text,
 * which sections to include).
 */
const DownloadResumeButton = ({ profile, options, variant = "brass", label = "Download Resume (PDF)", style }) => {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = profile || (await api.get("/profile")).data.student;
      const hasContent = (data.education?.length || 0) + (data.projects?.length || 0) + (data.internships?.length || 0) +
        Object.values(data.skills || {}).flat().length;
      const { generateResumePdf, savePdf, resumeFileName } = await import("../utils/resumePdf.js");
      const bytes = await generateResumePdf(data, options);
      savePdf(bytes, resumeFileName(data.name));
      if (hasContent) toast.success("Resume downloaded.");
      else toast.info("Downloaded, but your profile is mostly empty. Add education, skills and projects in Edit Profile for a fuller resume.", 7000);
    } catch (err) {
      toast.error(err?.response ? getErrorMessage(err) : "Couldn't create the resume PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className={`btn ${variant}`} onClick={handleClick} disabled={busy} style={style}>
      {busy ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
      {busy ? "Preparing PDF…" : label}
    </button>
  );
};

export default DownloadResumeButton;
