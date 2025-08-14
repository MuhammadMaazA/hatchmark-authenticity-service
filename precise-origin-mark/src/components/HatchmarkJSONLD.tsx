/* eslint-disable max-len */
import React from "react";

export default function HatchmarkJSONLD() {
  const json = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Hatchmark",
    url: "https://example.com/",
    description:
      "Hatchmark proves the origin of digital works with verifiable fingerprints and authenticity checks.",
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}
