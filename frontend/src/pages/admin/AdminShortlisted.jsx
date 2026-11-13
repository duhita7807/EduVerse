import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2 } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import DriveSummary from "../../components/DriveSummary.jsx";
import DriveStatusBadge from "../../components/DriveStatusBadge.jsx";
import DriveShortlist from "../../components/DriveShortlist.jsx";
import ShortlistGroups from "../../components/ShortlistGroups.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import adminApi from "../../services/adminApi.js";
import { tpoApi } from "../../services/placementApi.js";
import { getErrorMessage } from "../../utils/apiError.js";
import { safeUrl } from "../../utils/safeUrl.js";

/**
 * Admin: per company/drive, the company details + criteria and the students
 * auto-shortlisted against them; below, students recruiters recommended, branch-wise.
 */
const AdminShortlisted = () => {
  const toast = useToast();
  const [drives, setDrives] = useState([]);
  const [driveId, setDriveId] = useState("");
  const [groups, setGroups] = useState([]);
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([tpoApi.listDrives(), adminApi.listShortlisted()])
      .then(([d, s]) => {
        const shortlisted = d.data.drives.filter((x) => x.shortlistedAt);
        setDrives(shortlisted);
        setDriveId(shortlisted[0]?._id || "");
        setGroups(s.data);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drive = drives.find((d) => d._id === driveId);
  const website = drive && safeUrl(drive.company.website);

  return (
    <DashboardLayout>
      <PageHeader
        title="Shortlisted Students"
        subtitle="Company details, their criteria, and the students who meet them — branch-wise."
        actions={
          drives.length > 0 && (
            <select value={driveId} onChange={(e) => setDriveId(e.target.value)} aria-label="Company drive">
              {drives.map((d) => <option key={d._id} value={d._id}>{d.company.name} — {d.title}</option>)}
            </select>
          )
        }
      />

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--slate)" }}>Loading shortlisted students…</p>
      ) : !drive ? (
        <EmptyState title="No company shortlists yet" description="Approve a company's drive and its eligible students are shortlisted automatically." />
      ) : (
        <>
          <SectionCard
            title={drive.company.name}
            icon={Building2}
            action={<span style={{ display: "flex", gap: 10, alignItems: "center" }}><DriveStatusBadge status={drive.status} /><Link to={`/tpo/drives/${drive._id}`} style={{ fontSize: 13, color: "var(--accent-indigo)" }}>Open drive</Link></span>}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 13, marginBottom: 12 }}>
              <span><strong>Role:</strong> {drive.title}</span>
              {drive.company.industry && <span><strong>Industry:</strong> {drive.company.industry}</span>}
              {website && <a href={website} target="_blank" rel="noreferrer" style={{ color: "var(--accent-indigo)" }}>{drive.company.website}</a>}
              <span><strong>Recruiter:</strong> {drive.recruiter?.name} ({drive.recruiter?.email})</span>
            </div>
            <DriveSummary drive={drive} showRounds={false} />
          </SectionCard>
          {/* key remounts so the shortlist reloads when the company changes */}
          <DriveShortlist key={drive._id} drive={drive} />
        </>
      )}

      {!loading && (
        <SectionCard
          title="Recommended by recruiters"
          action={
            <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch">
              <option value="">All branches</option>
              {groups.map((g) => <option key={g.branch} value={g.branch}>{g.branch}</option>)}
            </select>
          }
        >
          <ShortlistGroups groups={branch ? groups.filter((g) => g.branch === branch) : groups} />
        </SectionCard>
      )}
    </DashboardLayout>
  );
};

export default AdminShortlisted;
