"use client";

import styles from "./TopologyGraph.module.css";

type TopologyGraphProps = {
  revealed: boolean;
  analyzing: boolean;
};

type NodeProps = {
  x: number;
  y: number;
  title: string;
  subtitle: string;
  type: "site" | "switch" | "radio" | "core";
  state?: "normal" | "shared" | "offline";
};

function TopologyNode({
  x,
  y,
  title,
  subtitle,
  type,
  state = "normal",
}: NodeProps) {
  return (
    <g
      className={`${styles.node} ${styles[type]} ${styles[state]}`}
      transform={`translate(${x} ${y})`}
    >
      {state === "shared" && <circle className={styles.pulse} r="42" />}
      <rect x="-54" y="-28" width="108" height="56" rx="13" />
      <circle cx="-36" cy="-11" r="4" className={styles.nodeIndicator} />
      <text className={styles.nodeTitle} textAnchor="middle" y="2">
        {title}
      </text>
      <text className={styles.nodeSubtitle} textAnchor="middle" y="18">
        {subtitle}
      </text>
    </g>
  );
}

export function TopologyGraph({ revealed, analyzing }: TopologyGraphProps) {
  return (
    <div
      className={`${styles.frame} ${revealed ? styles.revealed : ""} ${
        analyzing ? styles.analyzing : ""
      }`}
    >
      <div className={styles.graphHeader}>
        <div>
          <span className={styles.eyebrow}>
            {revealed ? "Observed topology" : "Documented topology"}
          </span>
          <h2>Site Alpha transport</h2>
        </div>
        <div className={styles.legend}>
          <span>
            <i className={styles.primaryDot} />
            Primary
          </span>
          <span>
            <i className={styles.backupDot} />
            Backup
          </span>
        </div>
      </div>

      <div className={styles.canvas}>
        <svg
          role="img"
          aria-label={
            revealed
              ? "Observed topology showing both paths sharing Aggregation Switch 1"
              : "Documented topology showing independent primary and backup paths"
          }
          viewBox="0 0 680 360"
        >
          <defs>
            <marker
              id="arrow-primary"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className={styles.primaryArrow} />
            </marker>
            <marker
              id="arrow-backup"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className={styles.backupArrow} />
            </marker>
            <marker
              id="arrow-risk"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className={styles.riskArrow} />
            </marker>
          </defs>

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

          <g className={styles.primaryPath}>
            <path d="M124 168 C168 140 194 112 196 102" />
            <path d="M304 90 L376 90" />
            <path d="M484 102 C528 120 550 145 556 168" />
          </g>

          <g className={styles.documentedBackup}>
            <path d="M124 192 C168 220 194 248 196 258" />
            <path d="M304 270 L376 270" />
            <path d="M484 258 C528 240 550 215 556 192" />
          </g>

          <g className={styles.observedBackup}>
            <path d="M124 174 C170 151 193 115 199 105" />
            <path d="M293 111 C342 146 369 216 391 247" />
            <path d="M484 258 C528 240 550 215 556 192" />
          </g>

          <TopologyNode
            x={70}
            y={180}
            title="SITE ALPHA"
            subtitle="14 circuits"
            type="site"
          />
          <TopologyNode
            x={250}
            y={90}
            title="SW-1"
            subtitle="Aggregation"
            type="switch"
            state={revealed ? "shared" : "normal"}
          />
          <TopologyNode
            x={250}
            y={270}
            title="SW-2"
            subtitle={revealed ? "Offline" : "Aggregation"}
            type="switch"
            state={revealed ? "offline" : "normal"}
          />
          <TopologyNode
            x={430}
            y={90}
            title="RADIO A"
            subtitle="Primary"
            type="radio"
          />
          <TopologyNode
            x={430}
            y={270}
            title="RADIO B"
            subtitle="Backup"
            type="radio"
          />
          <TopologyNode
            x={610}
            y={180}
            title="CORE"
            subtitle="Regional POP"
            type="core"
          />

          {revealed && (
            <g className={styles.riskBadge} transform="translate(250 154)">
              <rect x="-71" y="-17" width="142" height="34" rx="17" />
              <circle cx="-51" cy="0" r="5" />
              <text x="-38" y="5">
                SHARED DEPENDENCY
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className={styles.graphFooter}>
        <span className={styles.sourceLabel}>
          {revealed ? "Field observation applied" : "Source: network inventory"}
        </span>
        <span className={revealed ? styles.riskState : styles.healthyState}>
          <i />
          {revealed ? "Redundancy compromised" : "2 independent paths"}
        </span>
      </div>
    </div>
  );
}

