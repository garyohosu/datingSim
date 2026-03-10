$ErrorActionPreference = 'Stop'

$verifyPath = 'C:\project\datingSim\runtime_verify_tmp.html'
$html = @'
<!doctype html>
<html lang="ja">
<body>
<pre id="out">running</pre>
<script>
(async () => {
  const out = document.getElementById("out");
  const results = [];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    const frame = document.createElement("iframe");
    frame.src = "http://127.0.0.1:8123/index.html";
    document.body.appendChild(frame);

    await new Promise((resolve, reject) => {
      frame.onload = resolve;
      setTimeout(() => reject(new Error("iframe load timeout")), 10000);
    });

    await sleep(1200);

    const doc = frame.contentDocument;
    const click = (selector) => {
      const el = doc.querySelector(selector);
      if (!el) throw new Error("Missing selector: " + selector);
      el.click();
    };
    const text = () => doc.body.innerText.replace(/\s+/g, " ").trim();
    const exists = (selector) => Boolean(doc.querySelector(selector));

    results.push({ step: "title", ok: exists('[data-action="start"]') && exists('[data-action="continue"]') });

    click('[data-action="start"]');
    await sleep(600);
    results.push({ step: "start_game", ok: text().includes("At The Gate") });

    click('[data-action="advance-text"]');
    await sleep(200);
    results.push({ step: "advance_text", ok: text().includes("Wave back with a smile") && text().includes("Look away, embarrassed") });

    click('[data-action="choice"][data-choice-id="c1"]');
    await sleep(500);
    results.push({ step: "branch_a", ok: text().includes("At The Gate A") });

    click('[data-action="advance-text"]');
    await sleep(200);
    click('[data-action="next-episode"]');
    await sleep(500);
    results.push({ step: "day2", ok: text().includes("Promise After School") && text().includes("Day 2") });

    click('[data-action="back-title"]');
    await sleep(300);
    results.push({ step: "back_title", ok: exists('[data-action="continue"]') });

    click('[data-action="continue"]');
    await sleep(400);
    results.push({ step: "continue", ok: text().includes("Promise After School") });

    click('[data-action="back-title"]');
    await sleep(300);
    click('[data-action="updates"]');
    await sleep(300);
    results.push({ step: "updates", ok: text().includes("Added Episode 1") });

    click('[data-action="open-update-link"]');
    await sleep(500);
    results.push({ step: "view_only", ok: exists('[data-action="close-view-only"]') && text().includes("At The Gate") });

    click('[data-action="close-view-only"]');
    await sleep(300);
    click('[data-action="back-title"]');
    await sleep(300);
    click('[data-action="gallery"]');
    await sleep(300);
    results.push({ step: "gallery", ok: text().includes("Morning At Gate") });

    click('[data-action="back-title"]');
    await sleep(300);
    click('[data-action="diary"]');
    await sleep(300);
    results.push({ step: "diary_list", ok: text().includes("Morning At Gate") });

    const failed = results.filter((entry) => !entry.ok);
    out.textContent = JSON.stringify({ ok: failed.length === 0, results, failed }, null, 2);
  } catch (error) {
    out.textContent = JSON.stringify({ ok: false, error: String(error && error.message || error) }, null, 2);
  }
})();
</script>
</body>
</html>
'@

Set-Content -Path $verifyPath -Value $html -Encoding UTF8

$server = Start-Job -ScriptBlock {
  Set-Location 'C:\project\datingSim'
  python -m http.server 8123
}

Start-Sleep -Seconds 2

try {
  & 'C:\Program Files\Google\Chrome\Application\chrome.exe' `
    --headless=new `
    --disable-gpu `
    --allow-file-access-from-files `
    --virtual-time-budget=15000 `
    --dump-dom "http://127.0.0.1:8123/runtime_verify_tmp.html"
} finally {
  Stop-Job $server | Out-Null
  Remove-Job $server | Out-Null
  Remove-Item $verifyPath -Force -ErrorAction SilentlyContinue
}
