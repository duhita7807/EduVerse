import React from "react";

/**
 * Displays the Cloud-AI-generated narrative (summary + suggestion lists)
 * produced by aiAnalyticsService — kept visually distinct from the
 * backend-computed score so it reads as "explanation", not "the number".
 */
const AIInsightCard = ({ insights }) => {
  if (!insights || !insights.summary) {
    return (
      <p style={{ color: "var(--slate)" }}>
        No AI insights yet. Run analysis to get an AI-generated summary and priority actions.
      </p>
    );
  }

  const { summary, skillRecommendations = [], learningRecommendations = [], projectRecommendations = [] } = insights;

  return (
    <div>
      <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 16, color: "var(--text)", marginBottom: 18, lineHeight: 1.5 }}>
        "{summary}"
      </p>

      {skillRecommendations.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>Priority skills</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            {skillRecommendations.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
          </ul>
        </div>
      )}

      {learningRecommendations.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>Learning suggestions</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            {learningRecommendations.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
          </ul>
        </div>
      )}

      {projectRecommendations.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--slate)", marginBottom: 6 }}>Project ideas</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            {projectRecommendations.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AIInsightCard;
