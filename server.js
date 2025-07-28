import http from "http";
import fs from "fs";
import path from "path";
import url from "url";

const port = 8080;
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = path.join(__dirname, "dist");

// MIME types mapping
const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Add CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Handle static assets - serve them directly
  if (
    pathname.match(/\.(js|css|png|jpg|gif|svg|ico|ttf|woff|woff2|map|json)$/)
  ) {
    let filePath = path.join(distPath, pathname);

    // If the file doesn't exist at the direct path, try without /preview prefix
    if (!fs.existsSync(filePath) && pathname.startsWith("/preview/")) {
      filePath = path.join(distPath, pathname.substring("/preview".length));
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mimeType = mimeTypes[ext] || "application/octet-stream";

      res.setHeader("Content-Type", mimeType);
      res.setHeader("Cache-Control", "public, max-age=31536000");

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on("error", (err) => {
        console.error("Error serving file:", err);
        res.writeHead(404);
        res.end("File not found");
      });

      return;
    }
  }

  // For all other requests (HTML pages), serve index.html
  const indexPath = path.join(distPath, "index.html");

  if (fs.existsSync(indexPath)) {
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "no-cache");

    const fileStream = fs.createReadStream(indexPath);
    fileStream.pipe(res);

    fileStream.on("error", (err) => {
      console.error("Error serving index.html:", err);
      res.writeHead(500);
      res.end("Internal Server Error");
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${port}/`);
  console.log(`Serving from: ${distPath}`);
});
