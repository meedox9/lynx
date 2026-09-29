import Link from "next/link";

import { ProductNav } from "@/components/ProductNav";

import styles from "./landing.module.css";

export default function LandingPage() {
  return (
    <>
      <ProductNav />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              FIELD INTELLIGENCE FOR PHYSICAL NETWORKS
            </span>
            <h1>
              The field changed.
              <br />
              <span>Your records should too.</span>
            </h1>
            <p>
              Lynx converts technician recordings into reviewed inventory,
              topology, and configuration changes before the technician leaves
              the site.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} href="/workspace">
                Start a field session
              </Link>
              <Link className={styles.secondaryAction} href="/topology">
                Explore the topology
              </Link>
            </div>
          </div>

          <div className={styles.livePreview}>
            <div className={styles.previewHeader}>
              <span>
                <i />
                Tower Kilo · Install session
              </span>
              <small>00:16</small>
            </div>
            <div className={styles.waveform} aria-hidden="true">
              {[18, 36, 26, 48, 31, 57, 24, 44, 62, 39, 52, 27, 46, 20].map(
                (height, index) => (
                  <i key={index} style={{ height }} />
                ),
              )}
            </div>
            <blockquote>
              “Management is patched to switch two, port twelve.”
            </blockquote>
            <div className={styles.extractedEvent}>
              <span>00:16</span>
              <strong>RADIO-C</strong>
              <em>CONNECTED TO</em>
              <strong>SW-2 / PORT-12</strong>
            </div>
            <div className={styles.previewFooter}>
              <span>Evidence attached</span>
              <span>Awaiting operator approval</span>
            </div>
          </div>
        </section>

        <section className={styles.workflow}>
          <div className={styles.sectionIntro}>
            <span>HOW IT WORKS</span>
            <h2>From spoken work to governed change.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Capture</strong>
                <p>PLAUD records the technician’s normal field narration.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Structure</strong>
                <p>Crusoe resolves assets, relationships, values, and evidence.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Reason</strong>
                <p>Neo4j stages the graph change and checks its impact.</p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <strong>Approve</strong>
                <p>An operator reviews the source evidence before synchronization.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.modes}>
          <article>
            <span>COMMISSION</span>
            <h2>New equipment enters inventory as it enters the network.</h2>
            <p>
              Capture location, serial, ports, remote endpoints, RF parameters,
              and validation signals from one narrated installation.
            </p>
            <Link href="/workspace">Open commission workflow</Link>
          </article>
          <article>
            <span>RECONCILE</span>
            <h2>What is installed gets compared with what is documented.</h2>
            <p>
              Correct stale links and expose risks that only become visible after
              the observed topology changes.
            </p>
            <Link href="/workspace">Open reconciliation workflow</Link>
          </article>
        </section>

        <footer className={styles.footer}>
          <strong>Lynx</strong>
          <span>PLAUD captures · Crusoe structures · Neo4j reasons</span>
        </footer>
      </main>
    </>
  );
}
