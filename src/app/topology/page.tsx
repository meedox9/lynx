"use client";

import { useState } from "react";

import { ProductNav } from "@/components/ProductNav";
import { TopologyGraph } from "@/components/TopologyGraph";

import product from "../product.module.css";
import styles from "./topology.module.css";

export default function TopologyPage() {
  const [view, setView] = useState<"documented" | "observed">("observed");
  const observed = view === "observed";

  return (
    <>
      <ProductNav context="Topology" detail="Site Alpha" />
      <main className={product.page}>
        <header className={product.pageHeader}>
          <div>
            <span className={product.eyebrow}>NETWORK GRAPH</span>
            <h1>Topology</h1>
            <p>
              Compare the documented design with the latest evidence-backed field
              state.
            </p>
          </div>
          <div className={styles.viewSwitch}>
            <button
              className={!observed ? styles.active : ""}
              type="button"
              onClick={() => setView("documented")}
            >
              Documented
            </button>
            <button
              className={observed ? styles.active : ""}
              type="button"
              onClick={() => setView("observed")}
            >
              Observed
            </button>
          </div>
        </header>

        <section className={styles.layout}>
          <TopologyGraph revealed={observed} analyzing={false} />

          <aside className={styles.inspector}>
            <div className={styles.inspectorHeader}>
              <span>{observed ? "OBSERVED DIFFERENCES" : "DESIGN STATE"}</span>
              <strong>{observed ? "3" : "0"}</strong>
            </div>

            {observed ? (
              <div className={styles.findings}>
                <article>
                  <span>LINK CORRECTION</span>
                  <strong>Radio B → Switch 1 / Port 8</strong>
                  <p>Documented endpoint was Switch 2.</p>
                </article>
                <article>
                  <span>ASSET STATE</span>
                  <strong>Switch 2 offline</strong>
                  <p>Power is off and the uplink is removed.</p>
                </article>
                <article className={styles.critical}>
                  <span>GRAPH INFERENCE</span>
                  <strong>False redundancy</strong>
                  <p>Primary and backup paths now share Switch 1.</p>
                </article>
              </div>
            ) : (
              <div className={styles.designNote}>
                <strong>Two independent paths</strong>
                <p>
                  Inventory shows Radio A through Switch 1 and Radio B through
                  Switch 2.
                </p>
              </div>
            )}

            <div className={styles.inspectorFooter}>
              <span>Evidence source</span>
              <strong>Site Alpha walkdown · 16:18</strong>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}

