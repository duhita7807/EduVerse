import React from "react";

/**
 * Reusable shimmer skeleton blocks — used wherever content is loading
 * instead of a bare spinner/blank space (spec: use skeleton loaders).
 */
export const SkeletonLine = ({ width = "100%", height = 14, style }) => (
  <div className="skeleton" style={{ width, height, marginBottom: 8, ...style }} />
);

export const SkeletonCard = ({ lines = 3 }) => (
  <div className="card">
    <SkeletonLine width="40%" height={16} style={{ marginBottom: 16 }} />
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLine key={i} width={i === lines - 1 ? "60%" : "100%"} />
    ))}
  </div>
);

export const SkeletonCircle = ({ size = 60 }) => (
  <div className="skeleton" style={{ width: size, height: size, borderRadius: "50%" }} />
);

const LoadingSkeleton = { Line: SkeletonLine, Card: SkeletonCard, Circle: SkeletonCircle };

export default LoadingSkeleton;
