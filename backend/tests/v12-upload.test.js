import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import express from "express";
import validatedPetImageUpload, {
  MAX_PET_IMAGE_SIZE_BYTES,
} from "../middleware/validatedPetImageUpload.js";

const backendDirectory = fileURLToPath(new URL("../", import.meta.url));
const uploadsDirectory = path.join(backendDirectory, "uploads");
const stagingDirectory = path.join(os.tmpdir(), "pet-care-image-staging");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2suZkAAAAASUVORK5CYII=",
  "base64",
);

async function namesIn(directory) {
  try {
    return (await readdir(directory)).sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function fileSnapshot() {
  return {
    uploads: await namesIn(uploadsDirectory),
    staging: await namesIn(stagingDirectory),
  };
}

async function removeNewFiles(before) {
  for (const [key, directory] of [
    ["uploads", uploadsDirectory],
    ["staging", stagingDirectory],
  ]) {
    const originalNames = new Set(before[key]);
    for (const name of await namesIn(directory)) {
      if (!originalNames.has(name) && /^[0-9a-f-]{36}\.(?:jpg|png|gif|upload)$/i.test(name)) {
        await rm(path.join(directory, name), { force: true });
      }
    }
  }
}

async function withoutLeftoverFiles(action) {
  const before = await fileSnapshot();
  try {
    await action();
    assert.deepEqual(await fileSnapshot(), before);
  } finally {
    await removeNewFiles(before);
  }
}

function uploadForm(field, contents, filename, mimeType) {
  const form = new FormData();
  form.append(field, new Blob([contents], { type: mimeType }), filename);
  return form;
}

async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, baseUrl: `http://127.0.0.1:${server.address().port}` };
}

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function startBackend() {
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: backendDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      MONGODB_URI: "mongodb://127.0.0.1:1/v12-test?serverSelectionTimeoutMS=100",
    },
    stdio: "ignore",
  });

  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (child.exitCode !== null) throw new Error("Backend exited before it was ready.");
      try {
        const response = await fetch(`${baseUrl}/uploads/v12-ready.html`, {
          signal: AbortSignal.timeout(500),
        });
        if (response.status === 404) return { child, baseUrl };
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw new Error("Backend did not become ready within the test timeout.");
  } catch (error) {
    child.kill();
    throw error;
  }
}

async function stopBackend(child) {
  if (child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    once(child, "exit"),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}

test("V12 upload validation and public serving", { timeout: 30000 }, async (t) => {
  const app = express();
  const accepted = (req, res) => res.status(201).json({ filename: req.file.filename });
  app.post("/pet-image", validatedPetImageUpload("petImage"), accepted);
  app.post("/adoptable-image", validatedPetImageUpload("Pet_Image"), accepted);
  const { server, baseUrl: uploadUrl } = await listen(app);

  try {
    await t.test("valid PNG uploads are accepted for both field names", async () => {
      const before = await fileSnapshot();
      try {
        for (const [route, field] of [
          ["/pet-image", "petImage"],
          ["/adoptable-image", "Pet_Image"],
        ]) {
          const response = await fetch(`${uploadUrl}${route}`, {
            method: "POST",
            body: uploadForm(field, png, "pet.png", "image/png"),
          });
          assert.equal(response.status, 201);
          const { filename } = await response.json();
          assert.match(filename, /^[0-9a-f-]{36}\.png$/i);
          assert.deepEqual(await readFile(path.join(uploadsDirectory, filename)), png);
        }
        assert.deepEqual((await fileSnapshot()).staging, before.staging);
      } finally {
        await removeNewFiles(before);
      }
    });

    await t.test("plain HTML is rejected without leaving files", async () => {
      await withoutLeftoverFiles(async () => {
        const response = await fetch(`${uploadUrl}/pet-image`, {
          method: "POST",
          body: uploadForm("petImage", "<h1>not an image</h1>", "page.html", "text/html"),
        });
        assert.equal(response.status, 415);
      });
    });

    await t.test("HTML and SVG disguised as PNG fail signature validation", async () => {
      for (const contents of [
        "<h1>not an image</h1>",
        '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      ]) {
        await withoutLeftoverFiles(async () => {
          const response = await fetch(`${uploadUrl}/pet-image`, {
            method: "POST",
            body: uploadForm("petImage", contents, "disguised.png", "image/png"),
          });
          assert.equal(response.status, 415);
        });
      }
    });

    await t.test("files larger than 10 MB return 413 without leaving files", async () => {
      const oversized = Buffer.alloc(MAX_PET_IMAGE_SIZE_BYTES + 1);
      png.copy(oversized);
      await withoutLeftoverFiles(async () => {
        const response = await fetch(`${uploadUrl}/pet-image`, {
          method: "POST",
          body: uploadForm("petImage", oversized, "large.png", "image/png"),
        });
        assert.equal(response.status, 413);
      });
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  const { child, baseUrl } = await startBackend();
  try {
    await t.test("public uploads deny active extensions and serve images with nosniff", async () => {
      const id = randomUUID();
      const imageName = `v12-${id}.png`;
      const blockedNames = ["html", "svg", "js"].map((ext) => `v12-${id}.${ext}`);
      const names = [imageName, ...blockedNames];
      try {
        await writeFile(path.join(uploadsDirectory, imageName), png);
        for (const name of blockedNames) {
          await writeFile(path.join(uploadsDirectory, name), "<h1>blocked</h1>");
        }

        const imageResponse = await fetch(`${baseUrl}/uploads/${imageName}`);
        assert.equal(imageResponse.status, 200);
        assert.equal(imageResponse.headers.get("x-content-type-options"), "nosniff");
        assert.match(imageResponse.headers.get("content-type"), /^image\/png/);
        assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), png);

        for (const name of blockedNames) {
          const response = await fetch(`${baseUrl}/uploads/${name}`);
          assert.equal(response.status, 404, name);
        }
      } finally {
        await Promise.all(names.map((name) => rm(path.join(uploadsDirectory, name), { force: true })));
      }
    });

    await t.test("failed adoption creation removes newly uploaded public files", async () => {
      for (const [route, field] of [
        ["/api/foradoption", "petImage"],
        ["/api/adoptablepets", "Pet_Image"],
      ]) {
        await withoutLeftoverFiles(async () => {
          const response = await fetch(`${baseUrl}${route}`, {
            method: "POST",
            body: uploadForm(field, png, "pet.png", "image/png"),
          });
          assert.equal(response.status, 500);
        });
      }
    });
  } finally {
    await stopBackend(child);
  }
});
