import Link from "next/link";

import { ProductNav } from "@/components/ProductNav";

import product from "../product.module.css";
import styles from "./sessions.module.css";

const sessions = [
  {
    site: "Tower Kilo",
    title: "Radio C commissioning",
    mode: "Commission",
    duration: "00:34",
    snapshots: 6,
    state: "Review ready",
    tone: "scheduled",
    observed: "Today, 16:10",
  },
  {
    site: "Site Alpha",
    title: "Final transport walkdown",
    mode: "Reconcile",
    duration: "00:29",
    snapshots: 3,
    state: "Critical finding",
    tone: "critical",
    observed: "Today, 16:18",
  },
  {
    site: "Site Bravo",
    title: "Quarterly topology audit",
    mode: "Reconcile",
    duration: "Not started",
    snapshots: 0,
    state: "Scheduled",
    tone: "scheduled",
    observed: "Tomorrow, 09:00",
  },
];

export default function SessionsPage() {
  return (
    <>
      <ProductNav context="Field sessions" detail="2 completed today" />
      <main className={product.page}>
        <header className={product.pageHeader}>
          <div>
            <span className={product.eyebrow}>FIELD EVIDENCE</span>
            <h1>Sessions</h1>
            <p>
              Recordings, extracted snapshots, findings, and approvals kept
              together as one operational record.
            </p>
          </div>
          <Link className={product.primaryLink} href="/workspace">
            New field session
          </Link>
        </header>

        <section className={styles.sessionList}>
          {sessions.map((session) => (
            <article className={styles.session} key={session.title}>
              <div className={styles.sessionIcon}>
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className={styles.sessionIdentity}>
                <span>{session.site}</span>
                <h2>{session.title}</h2>
                <small>{session.observed}</small>
              </div>
              <dl>
                <div>
                  <dt>Mode</dt>
                  <dd>{session.mode}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{session.duration}</dd>
                </div>
                <div>
                  <dt>Snapshots</dt>
                  <dd>{session.snapshots}</dd>
                </div>
              </dl>
              <span className={`${styles.state} ${styles[session.tone]}`}>
                {session.state}
              </span>
              <Link href="/workspace" aria-label={`Open ${session.title}`}>
                →
              </Link>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}

