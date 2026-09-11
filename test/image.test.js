import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { effectiveSceneDuration, generateSceneImage, motionFilter, speechRateForTarget } from '../server/render.js';

test('preserves requested duration, fits narration and animates every scene image', () => {
  assert.equal(effectiveSceneDuration(40,23.25),40);
  assert.equal(effectiveSceneDuration(5,4.2),5);
  assert.equal(effectiveSceneDuration(5,7.1),8);
  assert.equal(speechRateForTarget(23.25,40),112);
  assert.equal(speechRateForTarget(39.5,40),190);
  assert.match(motionFilter('image',0,24),/zoompan/);
  assert.match(motionFilter('html',1,24),/zoompan/);
});

test('downloads and normalizes a generated scene image', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.IMAGE_API_KEY;
  const originalBase = process.env.IMAGE_API_BASE_URL;
  const originalModel = process.env.IMAGE_MODEL;
  const source = await sharp({ create: { width: 1664, height: 928, channels: 3, background: '#167d9a' } }).png().toBuffer();
  let requestBody;
  process.env.IMAGE_API_KEY = 'test-only-key';
  process.env.IMAGE_API_BASE_URL = 'https://images.test/v1';
  process.env.IMAGE_MODEL = 'test-image-model';
  globalThis.fetch = async (url, options) => {
    if (url === 'https://images.test/v1/images/generations') {
      requestBody = JSON.parse(options.body);
      assert.equal(options.headers.Authorization, 'Bearer test-only-key');
      return new Response(JSON.stringify({ images: [{ url: 'https://cdn.test/generated.png' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    assert.equal(url, 'https://cdn.test/generated.png');
    return new Response(source, { status: 200, headers: { 'content-type': 'image/png' } });
  };
  try {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'video-image-test-'));
    const target = path.join(directory, 'scene.png');
    const provider = await generateSceneImage({ visual_prompt: '一滴水从云中落下' }, { video: { title: '水循环' } }, target, { downloadImage: async (url, download) => { assert.equal(url, 'https://cdn.test/generated.png'); await writeFile(download, source); } });
    assert.equal(provider, 'siliconflow');
    assert.equal(requestBody.model, 'test-image-model');
    assert.equal(requestBody.image_size, '1664x928');
    assert.match(requestBody.prompt, /一滴水从云中落下/);
    const metadata = await sharp(await readFile(target)).metadata();
    assert.equal(metadata.width, 1280);
    assert.equal(metadata.height, 720);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.IMAGE_API_KEY; else process.env.IMAGE_API_KEY = originalKey;
    if (originalBase === undefined) delete process.env.IMAGE_API_BASE_URL; else process.env.IMAGE_API_BASE_URL = originalBase;
    if (originalModel === undefined) delete process.env.IMAGE_MODEL; else process.env.IMAGE_MODEL = originalModel;
  }
});

test('maps image billing failures to an actionable fatal error', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.IMAGE_API_KEY;
  process.env.IMAGE_API_KEY = 'test-only-key';
  globalThis.fetch = async () => new Response(JSON.stringify({ code: 30011 }), { status: 402, headers: { 'content-type': 'application/json' } });
  try {
    await assert.rejects(
      generateSceneImage({ visual_prompt: '测试画面' }, { video: { title: '测试' } }, path.join(os.tmpdir(), 'never-written.png')),
      error => error.status === 402 && error.imageFatal === true && /余额不足/.test(error.message)
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.IMAGE_API_KEY; else process.env.IMAGE_API_KEY = originalKey;
  }
});
