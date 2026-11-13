import React from "react";
import { Award, FileText, ExternalLink, BadgeCheck } from "lucide-react";
import { assetUrl, isImageFile } from "../utils/assetUrl.js";
import VerificationBadge from "./VerificationBadge.jsx";

const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

/**
 * Read-only certificate row: title, issuer/date, plus links to the uploaded
 * certificate file and/or the online credential. Used on My Profile and the
 * Digital Profile. `compact` trims it down for the digital profile summary.
 */
const CertificateItem = ({ cert, compact = false }) => {
  const file = cert.certificateFile;
  const date = formatDate(cert.issueDate);

  return (
    <div className={`cert-item ${compact ? "compact" : ""}`}>
      <div className="cert-item-thumb">
        {file?.url && isImageFile(file) ? (
          <a href={assetUrl(file.url)} target="_blank" rel="noreferrer" aria-label={`Open ${cert.title} certificate`}>
            <img src={assetUrl(file.url)} alt="" />
          </a>
        ) : (
          <Award size={compact ? 16 : 20} />
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="cert-item-title">{cert.title}</div>
        {(cert.issuedBy || date) && (
          <div className="cert-item-meta">{[cert.issuedBy, date].filter(Boolean).join(" · ")}</div>
        )}
        {(file?.url || cert.credentialUrl) && (
          <div className="cert-item-links">
            {file?.url && (
              <a href={assetUrl(file.url)} target="_blank" rel="noreferrer" className="cert-link">
                <FileText size={13} /> View certificate
              </a>
            )}
            {cert.credentialUrl && (
              <a href={cert.credentialUrl} target="_blank" rel="noreferrer" className="cert-link">
                <BadgeCheck size={13} /> Verify credential <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}
        {file?.url && cert.verificationStatus && cert.verificationStatus !== "unreviewed" && (
          <div style={{ marginTop: 4 }}>
            <VerificationBadge status={cert.verificationStatus} note={cert.verificationNote} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateItem;
