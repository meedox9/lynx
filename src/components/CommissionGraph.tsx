"use client";

import styles from "./TopologyGraph.module.css";

type CommissionGraphProps = {
  revealed: boolean;
  approved: boolean;
  analyzing: boolean;
  complete: boolean;
};

function CommissionNode({
  x,
  y,
  title,
  subtitle,
  proposed = false,
  approved = false,
}: {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  proposed?: boolean;
  approved?: boolean;
}) {
  return (
    <g
      className={`${styles.commissionNode} ${
        proposed ? styles.proposedNode : ""
      } ${approved ? styles.approvedNode : ""}`}
      transform={`translate(${x} ${y})`}
    >
      <rect x="-56" y="-29" width="112" height="58" rx="13" />
      <circle cx="-38" cy="-11" r="4" />
      <text className={styles.nodeTitle} textAnchor="middle" y="2">
        {title}
      </text>
      <text className={styles.nodeSubtitle} textAnchor="middle" y="18">
        {subtitle}
      </text>
    </g>
  );
}

export function CommissionGraph({
  revealed,
  approved,
  analyzing,
  complete,
}: CommissionGraphProps) {
  return (
    <div
      className={`${styles.frame} ${revealed ? styles.revealed : ""} ${
        approved ? styles.commissionApproved : ""
      } ${analyzing ? styles.analyzing : ""}`}
    >
      <div className={styles.graphHeader}>
        <div>
          <span className={styles.eyebrow}>
            {approved
              ? "Approved inventory graph"
              : revealed
                ? "Proposed inventory graph"
                : "Current inventory graph"}
          </span>
          <h2>Tower Kilo commissioning</h2>
        </div>
        <div className={styles.legend}>
          <span>
            <i className={styles.primaryDot} />
            Existing
          </span>
          <span>
            <i className={styles.backupDot} />
            {approved ? "Synced" : "Proposed"}
          </span>
        </div>
      </div>

      <div className={styles.canvas}>
        <svg
          role="img"
          aria-label="Commissioning graph for a new radio installation at Tower Kilo"
          viewBox="0 0 680 360"
        >
          <g className={styles.grid}>
            {Array.from({ length: 14 }, (_, index) => (
              <line
                key={`vertical-${index}`}
                x1={index * 52}
                y1="0"
                x2={index * 52}
                y2="360"
              />
            ))}
            {Array.from({ length: 8 }, (_, index) => (
              <line
                key={`horizontal-${index}`}
                x1="0"
                y1={index * 52}
                x2="680"
                y2={index * 52}
              />
            ))}
          </g>

          <g className={styles.existingCommissionEdges}>
            <path d="M124 180 L184 180" />
          </g>

          <g className={styles.proposedCommissionEdges}>
            <path d="M296 180 L354 180" />
            <path d="M446 166 C485 144 500 120 518 104" />
            <path d="M446 194 C500 222 530 244 554 257" />
          </g>

          <CommissionNode
            x={70}
            y={180}
            title="TOWER KILO"
            subtitle="Rack 2 · U18"
          />
          <CommissionNode
            x={240}
            y={180}
            title="SW-2"
            subtitle="Port 12"
          />
          <CommissionNode
            x={400}
            y={180}
            title="RADIO C"
            subtitle={revealed ? "LC-8841" : "Not inventoried"}
            proposed
            approved={approved}
          />
          <CommissionNode
            x={566}
            y={86}
            title="DISH 3"
            subtitle="18.7 GHz · V"
            proposed
            approved={approved}
          />
          <CommissionNode
            x={610}
            y={270}
            title="RADIO D"
            subtitle="Site Bravo"
            proposed
            approved={approved}
          />

          {revealed && (
            <g className={styles.changeBadge} transform="translate(400 252)">
              <rect x="-79" y="-17" width="158" height="34" rx="17" />
              <circle cx="-58" cy="0" r="5" />
              <text x="-45" y="5">
                {approved
                  ? "SYNCED TO INVENTORY"
                  : complete
                    ? "6 CHANGES STAGED"
                    : "5 CHANGES STAGED"}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className={styles.graphFooter}>
        <span className={styles.sourceLabel}>
          {approved
            ? "Human-approved change set applied"
            : revealed
              ? "Awaiting network operator approval"
              : "Source: current inventory"}
        </span>
        <span className={approved ? styles.healthyState : styles.proposedState}>
          <i />
          {approved
            ? "Inventory synchronized"
            : revealed
              ? "Review required"
              : "No Radio C record"}
        </span>
      </div>
    </div>
  );
}

