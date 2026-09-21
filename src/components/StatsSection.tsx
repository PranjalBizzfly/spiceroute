import { siteConfig } from "@/data/siteConfig";
import Reveal from "./Reveal";

/**
 * "SpiceJet in Numbers" — the source labels and figures, set as a ruled
 * typographic list rather than dashboard tiles.
 */
export default function StatsSection() {
  return (
    <div>
      <Reveal>
        <dl className="ed-figures">
          {siteConfig.stats.map((item) => (
            <div key={item.id} className="ed-figure">
              <dt className="ed-figure__label">{item.label}</dt>
              <dd className="ed-figure__value">
                {item.prefix}
                {item.value}
                {item.suffix && <span>{item.suffix}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {/* Source footnote: "*Data Source: DGCA, FYI 2023-24" */}
      <p className="ed-note">Data source: DGCA, FY 2023&ndash;24.</p>
    </div>
  );
}
