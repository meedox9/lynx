"use client";

import { useEffect, useMemo, useState } from "react";

import { ProductNav } from "@/components/ProductNav";
import { baselineInventory } from "@/lib/inventory";
import type { InventoryAsset } from "@/lib/types";

import styles from "../product.module.css";

export default function InventoryPage() {
  const [assets, setAssets] = useState<InventoryAsset[]>(baselineInventory);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void fetch("/api/inventory")
      .then((response) => response.json())
      .then((body: { assets?: InventoryAsset[] }) => {
        if (body.assets) setAssets(body.assets);
      });
  }, []);

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return assets;
    return assets.filter((asset) =>
      [
        asset.id,
        asset.name,
        asset.kind,
        asset.site,
        asset.status,
        asset.detail,
      ].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [assets, query]);

  const active = assets.filter((asset) => asset.status === "active").length;
  const observed = assets.filter(
    (asset) => asset.source === "field_observation",
  ).length;
  const exceptions = assets.filter(
    (asset) => asset.status !== "active",
  ).length;

  return (
    <>
      <ProductNav context="Inventory" detail={`${assets.length} assets`} />
      <main className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <span className={styles.eyebrow}>SOURCE OF TRUTH</span>
            <h1>Inventory</h1>
            <p>
              Documented assets reconciled with the latest approved field
              observations.
            </p>
          </div>
        </header>

        <section className={styles.stats}>
          <div className={styles.stat}>
            <strong>{assets.length}</strong>
            <span>Total assets</span>
          </div>
          <div className={styles.stat}>
            <strong>{active}</strong>
            <span>Active</span>
          </div>
          <div className={styles.stat}>
            <strong>{observed}</strong>
            <span>Field-observed</span>
          </div>
          <div className={styles.stat}>
            <strong>{exceptions}</strong>
            <span>Need attention</span>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Network assets</h2>
            <input
              className={styles.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search asset, site, or status"
              aria-label="Search inventory"
            />
          </div>

          {filteredAssets.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Site</th>
                  <th>Status</th>
                  <th>Field detail</th>
                  <th>Source</th>
                  <th>Last observed</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <span className={styles.assetIdentity}>
                        <i className={styles.assetIcon}>
                          {asset.kind.slice(0, 2)}
                        </i>
                        <span>
                          <strong>{asset.name}</strong>
                          <small>{asset.id}</small>
                        </span>
                      </span>
                    </td>
                    <td>{asset.site}</td>
                    <td>
                      <span
                        className={`${styles.status} ${
                          asset.status === "offline"
                            ? styles.offline
                            : asset.status === "proposed"
                              ? styles.proposed
                              : ""
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td>{asset.detail}</td>
                    <td>
                      <span className={styles.source}>
                        {asset.source.replace("_", " ")}
                      </span>
                    </td>
                    <td>{asset.lastObserved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.empty}>No assets match this search.</div>
          )}
        </section>
      </main>
    </>
  );
}

