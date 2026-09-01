/* eslint-disable max-lines -- one-page vector report coordinates stay auditable when the layout is kept together */
import type { jsPDF as JsPdf } from "jspdf";
import type {
  LocalGridCompetitorSummary,
  LocalGridResultCell,
} from "@/types/schemas/local-seo";
import {
  buildLocalGridReportMetrics,
  formatGridRadius,
  type LocalGridReportContext,
  reportLocation,
  reportPriority,
} from "./localGridReport";

type Rgb = [number, number, number];

const COLORS = {
  ink: [17, 24, 39] as Rgb,
  muted: [100, 116, 139] as Rgb,
  line: [226, 232, 240] as Rgb,
  surface: [248, 250, 252] as Rgb,
  blue: [37, 99, 235] as Rgb,
  green: [34, 197, 94] as Rgb,
  lime: [132, 204, 22] as Rgb,
  amber: [245, 158, 11] as Rgb,
  red: [220, 38, 38] as Rgb,
  gray: [82, 82, 82] as Rgb,
  white: [255, 255, 255] as Rgb,
};

interface LocalGridMapImage {
  dataUrl: string;
  format: "JPEG" | "PNG";
  width: number;
  height: number;
}

interface LocalGridPdfInput {
  context: LocalGridReportContext;
  keyword: string;
  scannedAt: string;
  cells: LocalGridResultCell[];
  competitors: LocalGridCompetitorSummary[];
  mapImage: LocalGridMapImage;
}

type LocalGridPdfDownloadInput = Omit<LocalGridPdfInput, "mapImage"> & {
  mapElement: HTMLElement;
};

function setText(doc: JsPdf, color: Rgb, size: number, bold = false) {
  doc.setTextColor(...color);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
}

function fitText(doc: JsPdf, value: string, maxWidth: number) {
  if (doc.getTextWidth(value) <= maxWidth) return value;
  let shortened = value;
  while (
    shortened.length > 1 &&
    doc.getTextWidth(`${shortened.trimEnd()}...`) > maxWidth
  ) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened.trimEnd()}...`;
}

function panel(
  doc: JsPdf,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  doc.setDrawColor(...COLORS.line);
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
}

async function loadLogo() {
  try {
    const response = await fetch("/optimisr-report-logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const binary = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join(
      "",
    );
    return `data:${blob.type};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

async function captureLeafletMap(
  mapElement: HTMLElement,
): Promise<LocalGridMapImage> {
  const tileImages = [
    ...mapElement.querySelectorAll<HTMLImageElement>("img.leaflet-tile"),
  ];
  await Promise.all(
    tileImages.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          const finish = () => resolve();
          image.addEventListener("load", finish, { once: true });
          image.addEventListener("error", finish, { once: true });
          window.setTimeout(finish, 5_000);
        }),
    ),
  );
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const mapRect = mapElement.getBoundingClientRect();
  const scale = Math.max(2, Math.min(window.devicePixelRatio, 3));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(mapRect.width * scale);
  canvas.height = Math.round(mapRect.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not create the map image");
  context.scale(scale, scale);
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, mapRect.width, mapRect.height);

  for (const tile of tileImages) {
    if (!tile.complete || tile.naturalWidth === 0) continue;
    const rect = tile.getBoundingClientRect();
    context.drawImage(
      tile,
      rect.left - mapRect.left,
      rect.top - mapRect.top,
      rect.width,
      rect.height,
    );
  }

  const markerSnapshots = [
    ...mapElement.querySelectorAll<SVGPathElement>(
      ".leaflet-overlay-pane path.leaflet-interactive",
    ),
  ];
  const tooltips = [
    ...mapElement.querySelectorAll<HTMLElement>(".leaflet-tooltip"),
  ];
  markerSnapshots.forEach((marker, index) => {
    const rect = marker.getBoundingClientRect();
    const centerX = rect.left - mapRect.left + rect.width / 2;
    const centerY = rect.top - mapRect.top + rect.height / 2;
    context.beginPath();
    context.arc(centerX, centerY, rect.width / 2, 0, Math.PI * 2);
    context.globalAlpha = Number(marker.getAttribute("fill-opacity") ?? "1");
    context.fillStyle = marker.getAttribute("fill") ?? "#525252";
    context.fill();
    context.globalAlpha = 1;
    context.lineWidth = Number(marker.getAttribute("stroke-width") ?? "2");
    context.strokeStyle = marker.getAttribute("stroke") ?? "#525252";
    context.stroke();

    const tooltip = tooltips[index];
    if (!tooltip) return;
    context.fillStyle = tooltip.classList.contains("local-grid-rank-label-dark")
      ? "#172033"
      : "#ffffff";
    context.font = "800 12px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(tooltip.textContent ?? "", centerX, centerY);
  });

  const attribution = "Leaflet | © OpenStreetMap contributors";
  context.font = "11px Arial, sans-serif";
  const attributionWidth = context.measureText(attribution).width + 8;
  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.fillRect(
    mapRect.width - attributionWidth,
    mapRect.height - 18,
    attributionWidth,
    18,
  );
  context.fillStyle = "#0078a8";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(
    attribution,
    mapRect.width - attributionWidth + 4,
    mapRect.height - 9,
  );
  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error("The map could not be captured. Please try again.");
  }
  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.94),
    format: "JPEG",
    width: canvas.width,
    height: canvas.height,
  };
}

function drawMap(doc: JsPdf, mapImage: LocalGridMapImage) {
  const x = 15;
  const y = 57;
  const width = 130;
  const height = 87;
  panel(doc, x, y, width, height);
  setText(doc, COLORS.ink, 10, true);
  doc.text("GEO-GRID MAP", x + 6, y + 8);

  const imageBox = { x: x + 5, y: y + 12, width: width - 10, height: 61 };
  const imageRatio = mapImage.width / mapImage.height;
  const boxRatio = imageBox.width / imageBox.height;
  const imageWidth =
    imageRatio > boxRatio ? imageBox.width : imageBox.height * imageRatio;
  const imageHeight =
    imageRatio > boxRatio ? imageBox.width / imageRatio : imageBox.height;
  const imageX = imageBox.x + (imageBox.width - imageWidth) / 2;
  const imageY = imageBox.y + (imageBox.height - imageHeight) / 2;
  doc.addImage(
    mapImage.dataUrl,
    mapImage.format,
    imageX,
    imageY,
    imageWidth,
    imageHeight,
    undefined,
    "FAST",
  );
  doc.setDrawColor(...COLORS.line);
  doc.rect(imageX, imageY, imageWidth, imageHeight, "S");

  const legend = [
    [COLORS.green, "1-3"],
    [COLORS.lime, "4-10"],
    [COLORS.amber, "11-20"],
    [COLORS.red, "21+"],
    [COLORS.gray, "Not found"],
  ] as const;
  let legendX = x + 10;
  for (const [color, label] of legend) {
    doc.setFillColor(...color);
    doc.circle(legendX, y + 78, 1.5, "F");
    setText(doc, COLORS.muted, 6.5);
    doc.text(label, legendX + 2.8, y + 80);
    legendX += doc.getTextWidth(label) + 11;
  }
}

function metricCard(
  doc: JsPdf,
  input: {
    x: number;
    y: number;
    width: number;
    label: string;
    value: string;
    color: Rgb;
  },
) {
  const { x, y, width, label, value, color } = input;
  doc.setFillColor(...COLORS.surface);
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(x, y, width, 19, 2, 2, "FD");
  doc.setFillColor(...color);
  doc.roundedRect(x, y, 2, 19, 1, 1, "F");
  setText(doc, COLORS.muted, 6.5, true);
  doc.text(label.toUpperCase(), x + 6, y + 6);
  setText(doc, COLORS.ink, 15, true);
  doc.text(value, x + 6, y + 15);
}

function drawMetrics(doc: JsPdf, input: LocalGridPdfInput) {
  const metrics = buildLocalGridReportMetrics(input.cells);
  const x = 150;
  const y = 57;
  const width = 132;
  panel(doc, x, y, width, 87);
  setText(doc, COLORS.ink, 10, true);
  doc.text("KEY METRICS", x + 6, y + 8);

  const cardWidth = 57;
  metricCard(doc, {
    x: x + 6,
    y: y + 13,
    width: cardWidth,
    label: "Average visible rank",
    value:
      metrics.averageVisibleRank === null
        ? "-"
        : metrics.averageVisibleRank.toFixed(1),
    color: COLORS.blue,
  });
  metricCard(doc, {
    x: x + 69,
    y: y + 13,
    width: cardWidth,
    label: "Visibility",
    value: `${metrics.visibilityPercent}%`,
    color: COLORS.blue,
  });
  metricCard(doc, {
    x: x + 6,
    y: y + 36,
    width: cardWidth,
    label: "Top 3 share",
    value: `${metrics.topThreePercent}%`,
    color: COLORS.green,
  });
  metricCard(doc, {
    x: x + 69,
    y: y + 36,
    width: cardWidth,
    label: "Top 10 share",
    value: `${metrics.topTenPercent}%`,
    color: COLORS.lime,
  });
  metricCard(doc, {
    x: x + 6,
    y: y + 59,
    width: cardWidth,
    label: "Opportunity 11-20",
    value: `${metrics.opportunityPercent}%`,
    color: COLORS.amber,
  });
  metricCard(doc, {
    x: x + 69,
    y: y + 59,
    width: cardWidth,
    label: "Unranked",
    value: `${metrics.unrankedPercent}%`,
    color: COLORS.gray,
  });
}

function drawCompetitorTable(doc: JsPdf, input: LocalGridPdfInput) {
  const metrics = buildLocalGridReportMetrics(input.cells);
  const x = 15;
  const y = 149;
  const width = 267;
  const rowHeight = 5.5;
  panel(doc, x, y, width, 38);
  setText(doc, COLORS.ink, 9, true);
  doc.text("TOP LOCAL COMPETITORS IN THIS SCAN AREA", x + 5, y + 6);

  const columns = [x + 5, x + 143, x + 178, x + 211, x + 239];
  const widths = [133, 30, 28, 23, 22];
  const headings = ["Business", "Coverage", "Avg rank", "Rating", "Reviews"];
  doc.setFillColor(...COLORS.surface);
  doc.rect(x + 1, y + 9, width - 2, rowHeight, "F");
  setText(doc, COLORS.muted, 6.5, true);
  headings.forEach((heading, index) =>
    doc.text(heading, columns[index], y + 14),
  );

  const rows = [
    {
      name: `${input.context.businessName} (target)`,
      coverage: `${metrics.visibilityPercent}%`,
      averageRank:
        metrics.averageVisibleRank === null
          ? "-"
          : metrics.averageVisibleRank.toFixed(1),
      rating:
        input.context.rating === null ? "-" : input.context.rating.toFixed(1),
      reviews:
        input.context.reviewCount === null
          ? "-"
          : input.context.reviewCount.toLocaleString(),
    },
    ...input.competitors.slice(0, 3).map((competitor) => ({
      name: competitor.name,
      coverage: `${competitor.coveragePercent}%`,
      averageRank: competitor.averageRank.toFixed(1),
      rating: competitor.rating === null ? "-" : competitor.rating.toFixed(1),
      reviews:
        competitor.reviewCount === null
          ? "-"
          : competitor.reviewCount.toLocaleString(),
    })),
  ];

  rows.forEach((row, rowIndex) => {
    const baseline = y + 21 + rowIndex * rowHeight;
    setText(doc, COLORS.ink, 7, rowIndex === 0);
    doc.text(fitText(doc, row.name, widths[0]), columns[0], baseline);
    setText(doc, COLORS.ink, 7);
    doc.text(row.coverage, columns[1], baseline);
    doc.text(row.averageRank, columns[2], baseline);
    doc.text(row.rating, columns[3], baseline);
    doc.text(row.reviews, columns[4], baseline);
  });
}

function safeFileName(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function renderLocalGridPdf(
  doc: JsPdf,
  input: LocalGridPdfInput,
  logo: string | null,
) {
  const metrics = buildLocalGridReportMetrics(input.cells);

  doc.setProperties({
    title: `Local Visibility Audit - ${input.context.businessName}`,
    subject: `Google Maps geo-grid report for ${input.keyword}`,
    author: "Optimisr",
    creator: "OpenSEO",
  });
  doc.setFillColor(...COLORS.white);
  doc.rect(0, 0, 297, 210, "F");

  if (logo) {
    doc.addImage(logo, "PNG", 15, 11, 38, 13.3, undefined, "FAST");
  } else {
    setText(doc, COLORS.ink, 14, true);
    doc.text("OPTIMISR", 15, 20);
  }
  setText(doc, COLORS.ink, 17, true);
  doc.text("LOCAL VISIBILITY AUDIT", 148.5, 18, { align: "center" });
  setText(doc, COLORS.muted, 7);
  doc.text(
    `Date: ${new Date(input.scannedAt).toLocaleDateString("en-GB")}`,
    282,
    18,
    { align: "right" },
  );
  doc.setDrawColor(...COLORS.blue);
  doc.setLineWidth(1.1);
  doc.line(15, 28, 282, 28);

  doc.setFillColor(...COLORS.surface);
  doc.roundedRect(15, 33, 267, 18, 2.5, 2.5, "F");
  setText(doc, COLORS.muted, 6.5, true);
  doc.text("BUSINESS", 20, 39);
  doc.text("TARGET KEYWORD", 151, 39);
  doc.text("LOCATION", 20, 47);
  doc.text("GRID COVERAGE", 151, 47);
  setText(doc, COLORS.ink, 8.5, true);
  doc.text(fitText(doc, input.context.businessName, 96), 48, 39);
  doc.text(fitText(doc, `"${input.keyword}"`, 102), 183, 39);
  setText(doc, COLORS.ink, 8.5);
  doc.text(fitText(doc, reportLocation(input.context), 96), 48, 47);
  doc.text(formatGridRadius(input.context), 183, 47);

  drawMap(doc, input.mapImage);
  drawMetrics(doc, input);
  drawCompetitorTable(doc, input);

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(15, 190, 267, 9, 2, 2, "F");
  setText(doc, COLORS.blue, 6.5, true);
  doc.text("RECOMMENDED NEXT STEP", 20, 195);
  setText(doc, COLORS.ink, 7.5);
  doc.text(fitText(doc, reportPriority(metrics), 220), 57, 195);

  setText(doc, COLORS.muted, 5.8);
  doc.text(
    "Coverage is the share of completed points where a listing appeared. Competitor average rank is calculated only where that listing appeared.",
    15,
    204,
  );
  doc.text(
    "Prepared by Optimisr | Google Maps results vary by location and can change over time.",
    282,
    204,
    { align: "right" },
  );

  return doc;
}

export async function downloadLocalGridPdf(input: LocalGridPdfDownloadInput) {
  const [{ jsPDF }, logo, mapImage] = await Promise.all([
    import("jspdf"),
    loadLogo(),
    captureLeafletMap(input.mapElement),
  ]);
  const doc = renderLocalGridPdf(
    new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" }),
    { ...input, mapImage },
    logo,
  );

  const date = new Date(input.scannedAt).toISOString().slice(0, 10);
  doc.save(
    `${safeFileName(input.context.businessName)}-${safeFileName(input.keyword)}-${date}.pdf`,
  );
}
