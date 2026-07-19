import chalk from 'chalk';

export function displayWelcome(): void {
  const cyan = chalk.hex('#00D9FF');
  const lavender = chalk.hex('#B4A0FF');
  const gray = chalk.hex('#64748B');
  const white = chalk.hex('#F1F5F9');

  console.clear();
  console.log('');
  console.log(cyan('    ____          __     __  ___          __   ______                    '));
  console.log(cyan('   / __ \\ ___   / /_   /  |/  /___  ____/ /  / ____/____  _____ ____ ___ '));
  console.log(cyan('  / /  / / _ \\ / __/  / /|_/ / __ \\/ __  /  / /_   / __ \\/ ___// __ `/ _ \\'));
  console.log(cyan(' / /__/ /  __// /_   / /  / / /_/ / /_/ /  / __/  / /_/ / /   / /_/ /  __/'));
  console.log(cyan(' \\____/ \\___/ \\__/  /_/  /_/\\____/\\__,_/  /_/     \\____/_/    \\__, /\\___/ '));
  console.log(cyan('                                                              /____/      '));
  console.log('');
  console.log(white('  The AI Software Migration Engineer'));
  console.log(lavender('  Understands your repository. Plans a safe migration.'));
  console.log(lavender('  Explains every change. Produces a review-ready pull request.'));
  console.log(gray(`  v0.3.0  |  Powered by Codex + GPT-5.6`));
  console.log('');
}
