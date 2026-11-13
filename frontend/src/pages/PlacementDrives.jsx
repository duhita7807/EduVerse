import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, CheckCircle2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout.jsx";
import PageHeader from "../components/PageHeader.jsx";
import SectionCard from "../components/SectionCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import DriveSummary from "../components/DriveSummary.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { studentPlacementApi } from "../services/placementApi.js";
import { getErrorMessage } from "../utils/apiError.js";

/** Approved drives the logged-in student is eligible for. */
const PlacementDrives = () => {
  const toast = useToast();
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await studentPlacementApi.listDrives();
      setDrives(res.data.drives);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const apply = async (drive) => {
    setBusyId(drive._id);
    try {
      const res = await studentPlacementApi.apply(drive._id);
      toast.success(res.message);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Placement drives" subtitle="Drives verified by the placement cell that match your branch, year and CGPA." />

      {loading ? (
        <p style={{ color: "var(--slate)" }}>Loading…</p>
      ) : drives.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No drives open for you right now"
          description="New drives appear here once the TPO approves them. Make sure your CGPA is on your profile so eligibility can be checked."
          actionLabel="Update profile"
          actionTo="/edit-profile"
        />
      ) : (
        drives.map((d, i) => (
          <SectionCard
            key={d._id}
            index={String(i + 1).padStart(2, "0")}
            title={`${d.company.name} — ${d.title}`}
            action={
              d.applied ? (
                <span className="badge success"><CheckCircle2 size={12} /> Applied</span>
              ) : (
                <button className="btn brass" disabled={d.deadlinePassed || busyId === d._id} onClick={() => apply(d)}>
                  {d.deadlinePassed ? "Deadline passed" : busyId === d._id ? "Applying…" : "Apply now"}
                </button>
              )
            }
          >
            <DriveSummary drive={d} />
            {d.applied && <p style={{ fontSize: 13, marginBottom: 0, marginTop: 12 }}>Track progress under <Link to="/applications" style={{ color: "var(--accent-indigo)", fontWeight: 600 }}>My Applications</Link>.</p>}
          </SectionCard>
        ))
      )}
    </DashboardLayout>
  );
};

export default PlacementDrives;
