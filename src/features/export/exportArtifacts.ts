function ensureXmlNamespace(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(clone);
}

export function safeFileStem(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "pipesonata-run";
}

export function serializeSvg(svg: SVGSVGElement): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${ensureXmlNamespace(svg)}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadText(
  contents: string,
  filename: string,
  type = "text/plain;charset=utf-8",
): void {
  downloadBlob(new Blob([contents], { type }), filename);
}

export function downloadSvg(svg: SVGSVGElement, filename: string): void {
  downloadText(serializeSvg(svg), filename, "image/svg+xml;charset=utf-8");
}

function loadSvgImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The visual score could not be rasterized."));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("The browser did not produce a PNG image."));
      }
    }, "image/png");
  });
}

export async function downloadPng(
  svg: SVGSVGElement,
  filename: string,
  background: string,
): Promise<void> {
  const serialized = serializeSvg(svg);
  const sourceUrl = URL.createObjectURL(
    new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }),
  );

  try {
    const image = await loadSvgImage(sourceUrl);
    const viewBox = svg.viewBox.baseVal;
    const width = Math.max(1, viewBox.width || svg.clientWidth || 1200);
    const height = Math.max(1, viewBox.height || svg.clientHeight || 720);
    const pixelRatio = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * pixelRatio);
    canvas.height = Math.ceil(height * pixelRatio);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D is not available in this browser.");
    }
    context.scale(pixelRatio, pixelRatio);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    downloadBlob(await canvasToBlob(canvas), filename);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
