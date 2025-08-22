import { App, type Command } from '#core/app';
import {
	ApplicationCommandOptionType,
	EmbedBuilder,
	SlashCommandBuilder,
	type APIEmbedField,
} from 'discord.js';

export const command: Command = {
	aliases: ['h'],
	data: new SlashCommandBuilder().setDescription('Displays a list of commands'),
	async run(ctx) {
		try {
			const fields: APIEmbedField[] = App.commands.map((command) => {
				const json = command.data.toJSON();
				const routes = (json.options ?? []).flatMap((option) => {
					if (option.type === ApplicationCommandOptionType.Subcommand) {
						const description = option.description ? ` — ${option.description}` : '';

						return [`/${json.name} ${option.name}${description}`];
					}
					if (option.type === ApplicationCommandOptionType.SubcommandGroup) {
						return (option.options ?? []).map((subOption) => {
							const description = subOption.description ? ` — ${subOption.description}` : '';

							return `/${json.name} ${option.name} ${subOption.name}${description}`;
						});
					}

					return [`\`${option.name}${option.required ? '*' : ''}\``];
				});
				const routesText = routes.join('\n');
				const help = command.help?.trim();
				const valueText = routes.length
					? help
						? `${json.description}\nRoutes:\n${routesText}\n${help}`
						: `${json.description}\n${routesText}`
					: help
					? `${json.description}\n${help}`
					: json.description;

				return {
					name: command.aliases?.length
						? `${json.name} (${command.aliases.map((alias) => `\`${alias}\``).join(', ')})`
						: json.name,
					value: valueText.trim(),
				};
			});
			const anyRequired = App.commands.some((command) =>
				command.data
					.toJSON()
					.options?.some(
						(option) =>
							option.type !== ApplicationCommandOptionType.Subcommand &&
							option.type !== ApplicationCommandOptionType.SubcommandGroup &&
							option.required
					)
			);
			const embed = new EmbedBuilder()
				.setColor(ctx.command.guild?.members.me?.displayHexColor ?? null)
				.setTitle('Commands')
				.setDescription(`Prefix: **${process.env.PREFIX ?? 'herb'}**`)
				.setFooter(anyRequired ? { text: '* = required' } : null)
				.addFields(fields);

			return await App.respond(ctx, { embeds: [embed] });
		} catch (error) {
			console.error('Help Command Error -', error);

			return await App.respond(ctx, 'Could not display commands', 'APP_ERROR');
		}
	},
};
