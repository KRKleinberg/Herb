import { App } from '#core/app';
import { DiscordAPIError, Events, REST, Routes } from 'discord.js';

App.once(Events.ClientReady, async () => {
	if (!process.env.DISCORD_BOT_TOKEN) throw new Error('ENV Error: DISCORD_BOT_TOKEN is not set!');
	if (!process.env.DISCORD_APP_ID) throw new Error('ENV Error: DISCORD_APP_ID is not set!');

	const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

	try {
		const body = App.commands.map((cmd) => cmd.data.toJSON());

		await rest.put(Routes.applicationCommands(process.env.DISCORD_APP_ID), {
			body,
		});

		console.log(
			body.length === 1
				? `Registered ${body.length} application command`
				: `Registered ${body.length} application commands`
		);
	} catch (error) {
		if (error instanceof DiscordAPIError)
			console.error(
				`Command sync failed: code=${error.code} status=${error.status} message=${error.message}`
			);
		else console.error('Application Command Setup Error -', error);
	}

	// Prevent crashes on uncaught exceptions and unhandled promise rejections
	process.on('uncaughtException', (error) => {
		console.error(`EXCEPTION CAUGHT: ${error}\n` + `EXCEPTION ORIGIN: ${error.stack ?? 'Unknown'}`);
	});
	process.on('unhandledRejection', async (reason, promise) => {
		console.error('UNHANDLED REJECTION:', promise, 'REASON:', reason);
	});

	console.log(
		`${App.user?.tag ?? 'UNDEFINED_TAG'} is online! Prefix set as "${process.env.PREFIX ?? 'herb'}"`
	);
});
