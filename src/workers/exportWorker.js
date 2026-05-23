/**
 * SALTEDHASH Export Worker
 * Handles off-screen canvas rendering on background thread
 * Prevents UI lag during image export operations
 * 
 * Flow: HTML DOM → SVG wrapper → OffscreenCanvas → PNG blob → Download link
 */

self.onmessage = async function (e) {
  const { htmlContent, width, height } = e.data;

  try {
    // Step 1: Wrap HTML in secure SVG container
    const svgData = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: monospace; }
        </style>
        <foreignObject width="100%" height="100%" x="0" y="0">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%; overflow: hidden;">
            ${htmlContent}
          </div>
        </foreignObject>
      </svg>
    `;

    // Step 2: Convert SVG to blob and data URL
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Step 3: Load SVG as image
    const img = new Image();
    img.src = svgUrl;

    img.onload = async function () {
      try {
        // Step 4: Create OffscreenCanvas and draw image
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Fill background to prevent transparency
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Step 5: Convert canvas to PNG blob
        const blob = await canvas.convertToBlob({ type: 'image/png', quality: 0.95 });
        const blobUrl = URL.createObjectURL(blob);

        // Step 6: Send blob URL back to main thread
        self.postMessage({ blobUrl });

        // Cleanup
        URL.revokeObjectURL(svgUrl);
      } catch (canvasError) {
        self.postMessage({ error: `Canvas rendering failed: ${canvasError.message}` });
      }
    };

    img.onerror = function () {
      self.postMessage({ error: 'Failed to load SVG image' });
    };
  } catch (error) {
    self.postMessage({ error: `Export worker error: ${error.message}` });
  }
};
