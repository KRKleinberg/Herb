import { App } from '#core/app';
import { DiscordAPIError, Events, GuildMember } from 'discord.js';

App.on(Events.MessageCreate, async (message) => {
	try {
		if (message.author.bot) return;
		if (!message.inGuild()) return;
		if (!message.member) return;

		const guild = message.guild;
		const member = message.member;

		const prefix = process.env.PREFIX || 'herb';
		if (!message.content.toLowerCase().startsWith(prefix)) return;

		const [input, ...args] = message.content.slice(prefix.length).trim().split(/\s+/);
		if (!input) return;

		const cmd =
			App.commands.get(input.toLowerCase()) ??
			App.commands.find((cmd) => cmd.aliases?.includes(input.toLowerCase()));
		if (!cmd) return;

		await message.channel.sendTyping();

		try {
			await cmd.run({ command: message, args, guild, member });
		} catch (error) {
			console.error('Prefix Command Error -', error);

			await App.respond({ command: message }, 'Something went wrong', 'APP_ERROR');
		}
	} catch (outer) {
		console.error('Prefix Command Handler Error -', outer);
	}
});

App.on(Events.InteractionCreate, async (interaction) => {
	try {
		const guild = interaction.guild;
		if (!guild) return;

		const member = interaction.member as GuildMember | null;
		if (!member) return;

		if (interaction.isAutocomplete()) {
			const cmd = App.commands.get(interaction.commandName);
			if (!cmd?.autocomplete) return;

			try {
				await cmd.autocomplete({ command: interaction, args: [], guild, member });
			} catch (error) {
				const code = error instanceof DiscordAPIError ? error.code : undefined;

				if (code !== 10062) console.error('Autocomplete Error -', error);
			}

			return;
		}

		if (interaction.isChatInputCommand()) {
			const cmd = App.commands.get(interaction.commandName);
			if (!cmd) return;

			if (!interaction.deferred && !interaction.replied) {
				await interaction.deferReply();
			}

			try {
				await cmd.run({ command: interaction, args: [], guild, member });
			} catch (error) {
				console.error('Slash Command Error -', error);

				await App.respond({ command: interaction }, 'Something went wrong', 'APP_ERROR');
			}
		}
	} catch (outer) {
		console.error('Interaction Command Handler Error -', outer);
	}
});
