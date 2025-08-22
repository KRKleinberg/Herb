import { App } from '#core/app';

console.log(`Starting ${process.env.npm_package_name}@${process.env.npm_package_version}...`);

await Promise.all([await App.initCommands(), await App.initEvents()]);

await App.login(process.env.DISCORD_BOT_TOKEN);
