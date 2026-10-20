const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

test('viewer script parses and has 51 validated original source files', () => {
  new vm.Script(js);
  const metadata = JSON.parse(js.match(/const VIDEO_METADATA = (\{[^\n]+\});/)[1]);
  assert.equal(Object.keys(metadata).length, 51);
  for (const [name, value] of Object.entries(metadata)) {
    assert.match(name, /^w\d+t\d+\.mp4$/);
    assert(Number.isInteger(value.frames) && value.frames > 0);
    assert(Number.isInteger(value.bytes) && value.bytes > 0);
  }
  assert(!html.includes('/*__VIDEO_METADATA__*/'));
});

test('only local file/blob media; no uploads or third party scripts', () => {
  assert(html.includes('URL.createObjectURL(selected)'));
  assert(html.includes("connect-src 'none'"));
  assert(html.includes("form-action 'none'"));
  assert(!/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/.test(js));
  assert(!/<script\b[^>]*\bsrc\s*=/i.test(html));
  assert(!/(?:file:\/\/\/|[A-Z]:[\\/])/.test(html));
});

test('speed, recent replay, loop and source-frame confirmation remain present', () => {
  for (const id of ['speed','recent','range-start','range-end','repeat','replay','stop-replay','previous','next']) {
    assert(html.includes(`id="${id}"`));
  }
  for (const rate of ['0.1','0.25','0.5','1','2']) assert(html.includes(`value="${rate}"`));
  assert(js.includes('requestVideoFrameCallback'));
  assert(js.includes('selectedMetadata.bytes !== selected.size'));
});

test('guide and prominent decoder warning available without videos', () => {
  assert(html.includes('4K HEVC'));
  assert(html.includes('网页上线不等于浏览器具备HEVC解码能力'));
  for (const name of ['guide.html','guide.txt']) assert(fs.existsSync(path.join(root,name)));
  const guide = fs.readFileSync(path.join(root,'guide.txt'),'utf8');
  for (const term of ['首次不再可见','PRE','POST','≤30帧','0.1倍速']) assert(guide.includes(term));
});
