
const { spawn } = require('child_process');

spawn('node', ['server.js'], { cwd: __dirname, stdio: 'inherit' });

setTimeout(async () => {
  const open = (await import('open')).default;

  const tryCloudPub = () =>
    new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };

      const clo = spawn('clo', ['publish', 'http', '38472'], {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let out = '';
      const capture = (chunk) => {
        out += chunk.toString();
        const m = out.match(/->\s*(https:\/\/[^\s]+)/);
        if (m) finish({ url: m[1].trim() });
      };
      clo.stdout?.on('data', capture);
      clo.stderr?.on('data', capture);

      clo.on('error', () => finish(null));
      clo.on('exit', (code) => { if (code !== 0) finish(null); });
      setTimeout(() => finish(null), 8000);
    });

  const result = await tryCloudPub();

  if (result?.url) {
    console.log('\n✅ CloudPub:', result.url);
    console.log('   Отправь другу. Сид-фразу — один на двоих.');
    console.log('   Не закрывай это окно — иначе ссылка умрёт.\n');
    await open(result.url);
  } else {
    console.log('\n⚠ CloudPub не запустился (нет clo или не залогинен).');
    console.log('   Скачай clo: https://cloudpub.ru/docs/ → "Утилита командной строки"');
    console.log('   Выполни: clo login\n');
    await open('http://localhost:38472');
  }
}, 2000);
