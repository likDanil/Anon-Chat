
const { spawn } = require('child_process');
const path = require('path');

const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

setTimeout(async () => {
  const open = (await import('open')).default;
  console.log('\n✅ Чат открыт: http://localhost:38472');
  console.log('   Друг пусть тоже запустит батник и введёт тот же код чата.\n');
  await open('http://localhost:38472');
}, 1200);
